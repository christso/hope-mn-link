// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');

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
            console.log(
               'Downloaded HDMD Transactions from Ethereum network',
               result
            );
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
      .then(() => mintNewDmds());
}

// invoke mint, then save to MongoDB
function mintNewDmds() {}

function mintDmds(txns) {
   let mints = [];
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;

   //          hdmdClient.mint(amount, dmdTxn.txnHash).then(hdmdTxnHash => {});
}

function saveMints(mints) {}

// pull new DMD Txns into HDMD Txns
function pullDmdTxns(txns) {
   return new Promise((resolve, reject) => {
      resolve('success');
   });
}

module.exports = {
   reconcileTxns: reconcileTxns
};
