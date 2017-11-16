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
   let reconId = uuidv1();
   let dmdRecs = dmds.map(txn => {
      return {
         reconId: reconId,
         dmdTxnHash: txn.txnHash,
         amount: txn.amount,
         blockNumber: txn.blockNumber
      };
   });
   let hdmdRecs = hdmds.map(txn => {
      return {
         reconId: reconId,
         hdmdTxnHash: txn.txnHash,
         amount: txn.amount,
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
      .catch(err => console.log(`Error minting: ${err}`));
}

/**
* Gets HDMD account balances from DMD blockNumber by totalling from block 0
* @param {Number} blockNumber - DMD blockNumber to get the balance for
* @return {{Object, Object}[]}  - { addresses[], balances[] }
*/
function getBalancesDmdToHdmd(blockNumber) {
   // reconId = from dmdtxns left join recontxns on recontxns.dmdTxnHash = dmdtxns.txnHash
   // blockNumber = max(recontxns.blockNumber) where hdmdTxnHasn != null
   // get balances from hdmdtxns collection
}

module.exports = {
   synchronizeAll: synchronizeAll
};
