// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');
var BigNumber = require('bignumber.js');
const uuidv1 = require('uuid/v1');

var port = config.port;

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

var mintDocs = require('../models/mint');
var reconTxns = require('../models/reconTxn');

const nothingToMint = 'nothing-to-mint';

/**
* Remove dashes from uuid
* @param {String} uuid - UUID to be formated
* @return {String} formatted UUID
*/
function formatUuidv1(uuid) {
   return (
      uuid.substr(0, 8) +
      uuid.substr(9, 4) +
      uuid.substr(14, 4) +
      uuid.substr(19, 4) +
      uuid.substr(24, 12)
   );
}

function downloadDmdTxns() {
   return dmdClient
      .downloadTxns()
      .then(result => {
         if (result) {
            console.log('Downloaded DMD Transactions from CryptoID', result);
         } else {
            console.log(
               'Downloaded DMD Transactions from CryptoID - no changes found'
            );
         }
      })
      .catch(err => {
         console.log(
            'Error downloading from DMD CryptoID and saving to DB',
            err
         );
      });
}

function downloadHdmdTxns() {
   return hdmdClient
      .downloadTxns()
      .then(result => {
         if (result) {
            console.log('Downloaded HDMD Transactions from Ethereum network');
         } else {
            console.log(
               'Downloaded HDMD Transactions from Ethereum network - no changes found'
            );
         }
      })
      .catch(err => {
         console.log(
            'Error downloading HDMD Transactions from Ethereum network and saving to DB',
            err
         );
      });
}

/**
* Get amount that needs to be minted
* @param {Object[]} dmds - DMD transactions that needs to be matched
* @param {Object[]} hdmds - HDMD transactions that needs to be matched
* @return {BigNumber} amount that needs to be minted
*/
function getRequiredMintingAmount(dmds, hdmds) {
   dmdTotal = new BigNumber(0);
   dmds.forEach(txn => {
      dmdTotal = dmdTotal.add(txn.amount);
   });

   hdmdTotal = new BigNumber(0);
   hdmds.forEach(txn => {
      hdmdTotal = hdmdTotal.add(txn.amount);
   });

   return dmdTotal.sub(hdmdTotal);
}

/**
   * Reconcile HDMDs with DMDs in ReconTxns MongoDB collection
   * @param {Object[]} dmds - DMD transactions to be reconciled
   * @param {Object[]} hdmds - HDMD transactions to be reconciled
   * @return {Promise} result of the promise
   */
function reconcile(dmds, hdmds) {
   let reconId = formatUuidv1(uuidv1());
   let dmdRecs = dmds.map(txn => {
      return {
         reconId: reconId,
         dmdTxnHash: txn.txnHash,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber
      };
   });
   let hdmdRecs = hdmds.map(txn => {
      return {
         reconId: reconId,
         hdmdTxnHash: txn.txnHash,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber
      };
   });
   let recs = dmdRecs;
   recs.push(...hdmdRecs);
   return reconTxns.create(recs);
}

/**
   * Invoke mint on HDMD smart contract and reconcile with DMDs
   * @param {Object[]} dmds - DMD transactions to be matched
   * @param {Object[]} hdmds - HDMD transactions to be matched
   * @return {Promise} result of the promise
   */
function mintDmds(dmds, hdmds) {
   return new Promise((resolve, reject) => {
      let amount = getRequiredMintingAmount(dmds, hdmds);
      let txnHashResolved;
      if (amount.gt(0)) {
         txnHashResolved = hdmdClient.mint(amount);
         txnHashResolved
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount.toNumber()
               };
               console.log(`Mint invoked = ${JSON.stringify(mintTxn)}`);
               resolve(mintTxn);
            })
            .catch(err => reject(err));
      } else if (amount.lt(0)) {
         txnHashResolved = hdmdClient.unmint(amount.mul(-1));
         txnHashResolved
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount.mul(-1).toNumber()
               };
               console.log(`Unmint invoked = ${JSON.stringify(mintTxn)}`);
               resolve(mintTxn);
            })
            .catch(err => reject(err));
      } else {
         resolve(nothingToMint);
      }
   });
}

function saveMint(txn) {
   return mintDocs.create(txn);
}

/**
   * Get the latest reconTxn for HDMD
   * @param {Number} dmdBlockNumber - the DMD block number that has been reconciled. If this is undefined, then it will default to the latest block 
   * @return {Promise} - the last reconTxn for HDMD for the reconId associated with the DMD block number
   */
function getLastHdmdRecon(dmdBlockNumber) {
   return new Promise((resolve, reject) => {
      let p;

      if (dmdBlockNumber) {
         // Get the reconTxn for the *DMD block number*
         p = reconTxns
            .find({ dmdTxnHash: { $ne: null }, blockNumber: dmdBlockNumber })
            .limit(1)
            .then(res => {
               return res[0] ? res[0].reconId : undefined;
            });
      } else {
         // Get the reconTxn for the *latest DMD block*
         p = reconTxns
            .find({ dmdTxnHash: { $ne: null } })
            .sort({ blockNumber: -1 })
            .limit(1)
            .then(res => {
               return res[0] ? res[0].reconId : undefined;
            });
      }
      // return result
      p
         .then(reconId =>
            reconTxns
               .find({
                  hdmdTxnHash: { $ne: null },
                  reconId: reconId
               })
               .sort({ blockNumber: -1 })
               .limit(1)
         )
         .then(obj => resolve(...obj))
         .catch(err => reject(err));
   });
}

/**
* Gets HDMD account balances at the specified DMD blockNumber
* @param {Number} blockNumber - DMD blockNumber to get the balance for
* @return {{Object, Object}[]}  - { addresses[], balances[] }
*/
function getBalancesDmdToHdmd(blockNumber) {
   let matchStage = {
      $match: {
         hdmdTxnHash: { $ne: null },
         blockNumber: { $lte: blockNumber }
      }
   };

   let groupStage = {
      $group: {
         _id: '$account',
         totalAmount: { $sum: '$amount' }
      }
   };

   if (blockNumber === undefined) {
      delete matchStage.$match.blockNumber;
   }

   // get balances from hdmdtxns collection
   return reconTxns.aggregate([matchStage, groupStage]);
}

function synchronizeAll() {
   // wait for downloads to complete,
   // then find unmatched dmdTxns into hdmdTxns in MongDB,
   // then invoke mint and unmint on HDMD eth smart contract
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   let dmds;
   let hdmds;

   Promise.all([downloadDmdTxns(), downloadHdmdTxns()])
      .catch(err => console.log('Error downloading trasactions', err))
      .then(() => Promise.all([getUnmatchedDmds(), getUnmatchedHdmds()]))
      .catch(err =>
         console.log('Error retrieving unmatched transactions from MongoDB')
      )
      .then(values => {
         dmds = values[0];
         hdmds = values[1];
         return mintDmds(dmds, hdmds);
      })
      .then(minted => {
         if (minted && minted.txnHash) {
            return saveMint(minted);
         } else if (minted === nothingToMint) {
            reconcile(dmds, hdmds).then(() => console.log('Reconciled'));
         }
      })
      .catch(err => console.log(`Error minting: ${err}`))
      .then(() => {
         let lastSavedDmdBlock;
         getLastHdmdRecon()
            .then(obj => {
               //console.log(`Last HDMD recon = ${JSON.stringify(obj)}`);
            })
            .catch(err =>
               console.log(
                  `Error in getLastHdmdRecon(): ${JSON.stringify(err)}`
               )
            );
      });
}

module.exports = {
   synchronizeAll: synchronizeAll,
   getLastHdmdRecon: getLastHdmdRecon,
   getBalancesDmdToHdmd: getBalancesDmdToHdmd
};
