// Blockchain Reconciliation

var config = require('../config');

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var port = config.port;

// list hdmds not matched to dmds

module.exports = router;

// Pull DmdTxns and HdmdTxns

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');
let watchInterval = config.dmdWatchInterval;

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
   // download txns
   downloadDmdTxns();
   downloadHdmdTxns();

   // wait for downloads to complete,
   // then find unmatched dmdTxns into hdmdTxns in MongDB,
   // then invoke mint and unmint on HDMD eth smart contract
   Promise.all([downloadDmdTxns, downloadHdmdTxns])
      .then(res => {
         getUnmatchedDmdTxn().then(txns => pullDmdTxns(txns));
      })
      .catch(err => console.log('Error reconciling trasactions', err));
}

// get DMD Txns that don't exist in HDMD Txns MongoDB
function getUnmatchedDmdTxn() {
   return new Promise((resolve, reject) => {
      let txns = []; // get from Mongo
      resolve(txns);
   });
}

// pull new DMD Txns into HDMD Txns
function pullDmdTxns(txns) {
   return new Promise((resolve, reject) => {
      resolve('success');
   });
}

setInterval(() => reconcileTxns(), watchInterval);

router.post('/reconcile', function(req, res) {});

module.exports = router;
