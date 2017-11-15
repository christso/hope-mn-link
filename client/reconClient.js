// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');
var BigNumber = require('bignumber.js');

var port = config.port;

// Pull DmdTxns and HdmdTxns

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

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

function reconcileTxns() {
   // wait for downloads to complete,
   // then find unmatched dmdTxns into hdmdTxns in MongDB,
   // then invoke mint and unmint on HDMD eth smart contract
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   Promise.all([downloadDmdTxns(), downloadHdmdTxns()])
      .catch(err => console.log('Error downloading trasactions', err))
      .then(() => Promise.all([getUnmatchedDmds(), getUnmatchedHdmds()]))
      .catch(() =>
         console.log('Error retrieving unmatched transactions from MongoDB')
      )
      .then(([dmds, hdmds]) => mintDmds(dmds, hdmds))
      .catch(err => console.log(`Error minting: ${err}`))
      .then(txn => console.log(`Mint txnHash = ${txn}`));
}

/**
* Get amount that needs to be minted
* @param {Object[]} dmds - DMD transactions that needs to be matched
* @param {Object[]} hdmds - HDMD transactions that needs to be matched
* @return {BigNumber} amount that needs to be minted
*/
function getNeedsMintingAmount(dmds, hdmds) {
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
* Invoke mint on HDMD smart contract and reconcile with DMDs
* @param {Object[]} dmds - DMD transactions to be matched
* @param {Object[]} hdmds - HDMD transactions to be matched
* @return {Promise} result of the promise
*/
function mintDmds(dmds, hdmds) {
   let amount = getNeedsMintingAmount(dmds, hdmds);
   if (amount.gt(0)) {
      return hdmdClient.mint(amount);
   } else if (amount.lt(0)) {
      return hdmdClient.unmint(amount);
   }
   return Promise.resolve('nothing to mint');
}

function saveMints(mints) {}

// invoke mint, then save to MongoDB
function mintNewDmds() {}

module.exports = {
   reconcileTxns: reconcileTxns
};
