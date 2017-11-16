// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');
var BigNumber = require('bignumber.js');

var port = config.port;

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

var mintDocs = require('../models/mint');

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
function reconcile(dmds, hdmds) {}

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

function synchronizeAll() {
   // wait for downloads to complete,
   // then find unmatched dmdTxns into hdmdTxns in MongDB,
   // then invoke mint and unmint on HDMD eth smart contract
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   Promise.all([downloadDmdTxns(), downloadHdmdTxns()])
      .catch(err => console.log('Error downloading trasactions', err))
      .then(() => Promise.all([getUnmatchedDmds(), getUnmatchedHdmds()]))
      .catch(err =>
         console.log('Error retrieving unmatched transactions from MongoDB')
      )
      .then(([dmds, hdmds]) => mintDmds(dmds, hdmds))
      .then(minted => {
         if (minted && minted.txnHash) {
            return saveMint(minted);
         } else if (minted === nothingToMint) {
            console.log('Nothing to Mint');
         }
      })
      .catch(err => console.log(`Error minting: ${err}`));
}

function saveMint(txn) {
   return mintDocs.create(txn);
}

module.exports = {
   synchronizeAll: synchronizeAll
};
