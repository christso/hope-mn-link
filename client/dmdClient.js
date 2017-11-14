var config = require('../config');
var port = config.port;
var axios = require('axios').default;
var dmdTxns = require('../models/dmdTxn');
var mongoose = require('mongoose');
const dmdUrl = config.cryptoidDmdUri;
var hdmdClient = require('../client/hdmdClient');

/*----- Create DMD listener -----*/

// Call the API every hour.
// Create MongoDB document for each new DMD transaction, which stores the txn hash.
// List Balance: http://chainz.cryptoid.info/dmd/api.dws?q=getbalance&a=dH4bKCoyNj9BzLuyU4JvhwvhYs7cnogDVb
// List Txns: https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js

// Parse CryptoID query which lists all txns

function parseRawTxns(rawTxns) {
   let newTxns = rawTxns.map(rawTxn => {
      return {
         txnHash: rawTxn[1],
         blockNumber: rawTxn[2],
         amount: rawTxn[4],
         balance: rawTxn[5]
      };
   });
   return newTxns;
}

function saveTxns(newTxns) {
   return dmdTxns.create(newTxns);
}

// Find last saved txn in MongoDB
function getLastSavedTxn() {
   return dmdTxns
      .find()
      .sort({ blockNumber: -1 })
      .limit(1)
      .exec();
}

function getLastSavedBlockNumber() {
   return getLastSavedTxn().then(docs => formatSavedBlockNumber(docs));
}

function formatSavedBlockNumber(docs) {
   // format value
   let blockNumber = 0;
   if (docs.length > 0) {
      blockNumber = docs[0].blockNumber;
   }
   return blockNumber;
}

function getParsedTxns() {
   return axios.get(dmdUrl).then(function(response) {
      // Parse CryptoID txns
      return parseRawTxns(response.data.tx);
   });
}

function saveTxns(lastBlockNumber) {
   return getParsedTxns().then(parsedTxns => {
      let newTxns = parsedTxns.filter(txn => {
         return txn.blockNumber > lastBlockNumber;
      });

      return dmdTxns.create(newTxns);
   });
}

function mintTxns() {
   // Invoke mint() where amount > 0
   //   newTxns.forEach(function(dmdTxn) {
   //      let amount = hdmdClient.getRawValue(dmdTxn.amount);
   //      if (amount > 0) {
   //         hdmdClient
   //            .mint(amount, dmdTxn.txnHash)
   //            .then(txnHash =>
   //               Promise.resolve({ context: 'Mint', txnHash: txnHash })
   //            )
   //            .catch(err => Promise.reject({ context: 'Mint', error: err }));
   //      } else if (amount < 0) {
   //         // TODO: unmint
   //      }
   //   }, this);
}

function downloadTxns() {
   return getLastSavedBlockNumber().then(lastBlockNumber =>
      saveTxns(lastBlockNumber)
   );
}

var client = {
   downloadTxns: downloadTxns
};

module.exports = client;
