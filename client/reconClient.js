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
         return Promise.reject(err);
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
         return Promise.reject(err);
      });
}

/**
* Get amount that needs to be minted
* @param {<DmdTxn>[]} dmds - DMD transactions that needs to be matched
* @param {<HdmdTxn>[]} hdmds - HDMD transactions that needs to be matched
* @return {<BigNumber>} amount that needs to be minted
*/
function getRequiredMintingAmount(dmds, hdmds) {
   dmdTotal = new BigNumber(0);
   dmds.forEach(txn => {
      dmdTotal = dmdTotal.plus(txn.amount);
   });

   hdmdTotal = new BigNumber(0);
   hdmds.forEach(txn => {
      hdmdTotal = hdmdTotal.plus(txn.amount);
   });

   return dmdTotal.minus(hdmdTotal);
}

/**
   * Reconcile HDMDs with DMDs in ReconTxns MongoDB collection
   * @param {Object[]} dmds - DMD transactions to be reconciled
   * @param {Object[]} hdmds - HDMD transactions to be reconciled
   * @return {Promise.<ReconTxns[]>} result of the promise
   */
function reconcile(dmds, hdmds) {
   if (dmds === undefined || hdmds === undefined) {
      return Promise.reject(`parameters dmds and hdmds cannot be undefined`);
   }
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
         blockNumber: txn.blockNumber,
         eventName: txn.eventName
      };
   });
   let recs = dmdRecs;
   recs.push(...hdmdRecs);
   return reconTxns.create(recs);
}

/**
   * Invoke mint on HDMD smart contract and reconcile with DMDs
   * @param {<Dmd>[]} dmds - DMD transactions to be matched
   * @param {<Hdmd>[]} hdmds - HDMD transactions to be matched
   * @return {Promise.<{txnHash: string, amount: number}>} result of the promise
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

function getLastDmdRecon() {
   if (dmdBlockNumber) {
      // Get the reconTxn for the *DMD block number*
      return reconTxns
         .find({ dmdTxnHash: { $ne: null }, blockNumber: dmdBlockNumber })
         .limit(1)
         .then(res => {
            return res[0] ? res[0].reconId : undefined;
         });
   }
   // Get the reconTxn for the *latest DMD block*
   return reconTxns
      .find({ dmdTxnHash: { $ne: null } })
      .sort({ blockNumber: -1 })
      .limit(1)
      .then(res => {
         return res[0] ? res[0].reconId : undefined;
      });
}

/**
   * Get the latest reconTxn for HDMD
   * @param {Number} dmdBlockNumber - the DMD block number that has been reconciled. If this is undefined, then it will default to the latest block 
   * @return {Promise} - the last reconTxn for HDMD for the reconId associated with the DMD block number
   */
function getLastHdmdRecon(dmdBlockNumber) {
   return new Promise((resolve, reject) => {
      let p = getLastDmdRecon(dmdBlockNumber);
      getLastDmdRecon(dmdBlockNumber)
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
* @param {number} blockNumber - DMD blockNumber to get the balance for
* @return {{addresses: string[], balances: number[]}}  - { addresses[], balances[] }
*/
function getHdmdBalancesFromDmd(blockNumber) {
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
   return reconTxns.aggregate([matchStage, groupStage]).catch(err => {
      let newErr = new Error(
         `Error in getHdmdBalancesFromDmd(): ${err.message}`
      );
      Promise.reject(newErr);
   });
}

/**
* Download transactions to MongoDB
* @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
*/
function downloadTxns() {
   return Promise.all([downloadDmdTxns(), downloadHdmdTxns()]);
}

/**
* Retrieve unmatched transactions from MongoDB
* @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
*/
function getUnmatchedTxns(dmdBlockNumber) {
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   return Promise.all([getUnmatchedDmds(dmdBlockNumber), getUnmatchedHdmds()]);
}

/**
 * distribute the minted amount to entitled recipients
 * @param {<BigNumber>} amount 
 * @param {{_id: string, totalAmount: number}[]} balances 
 * @returns {Promise}
 */
function distributeMint(amount, balances) {
   if (!balances) {
      return Promise.reject(new Error(`Balances cannot be undefined`));
   }
   let recipients = balances.map(b => b._id);
   let weights = balances.map(b =>
      Math.round(b.totalAmount, config.hdmdDecimals)
   );

   return hdmdClient.apportion(amount, recipients, weights).catch(err => {
      return Promise.reject(
         new Error(`Error apportioning minted amount: ${err.stack}`)
      );
   });
}

/**
* Waits for downloads to complete,
then finds unmatched dmdTxns and hdmdTxns in MongoDB
then invokes mint and unmint on HDMD eth smart contract
* @return {Promise} - returns an empty promise if resolved
*/
function synchronizeAll() {
   let dmds;
   let hdmds;

   // Download transactions and get what is unmatched
   let p = downloadTxns()
      .then(() => getLastSavedDmdBlockInterval())
      .then(dmdBlockNumber => getUnmatchedTxns(dmdBlockNumber));

   // Invoke mint to synchronize HDMDs with DMDs
   p = p.then(values => {
      dmds = values[0];
      hdmds = values[1];
      return mintDmds(dmds, hdmds);
   });

   // Reconcile Txns if minting not required
   p = p.then(minted => {
      if (minted === nothingToMint) {
         reconcile(dmds, hdmds).then(recs => {
            let length = recs ? recs.length : 0;
            console.log(`Reconciled ${length} transactions`);
         });
      }
      return minted;
   });

   // If we have just minted, then distribute the minted amount to entitled recipients
   p = p.then(minted => {
      if (minted == nothingToMint) {
         return;
      }
      if (!minted || !minted.amount) {
         return Promise.reject(
            new Error('Expected minted amount to be non-zero')
         );
      }
      getLastHdmdRecon()
         .then(reconObj =>
            getHdmdBalancesFromDmd(reconObj ? reconObj.blockNumber : undefined)
         )
         .then(balances => distributeMint(minted.amount, balances));
   });
   return p;
}

/**
 * This will find the minimum dmdBlockInterval that is greater than the last reconciled DMD block.
 */
function getLastSavedDmdBlockInterval() {
   // TODO: the first DMD block is at 18386
   let lastReconBlock = 10000; // TODO: replace this magic number
   return dmdClient.getLastSavedBlockInterval(lastReconBlock);
}

module.exports = {
   synchronizeAll: synchronizeAll,
   getLastHdmdRecon: getLastHdmdRecon,
   getBalancesDmdToHdmd: getHdmdBalancesFromDmd,
   downloadTxns: downloadTxns,
   getUnmatchedTxns: getUnmatchedTxns,
   reconcile: reconcile,
   downloadDmdTxns: downloadDmdTxns,
   getLastSavedDmdBlockInterval: getLastSavedDmdBlockInterval,
   mintDmds: mintDmds,
   nothingToMint: nothingToMint
};
