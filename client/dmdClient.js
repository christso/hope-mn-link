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

function getLastSavedTxn() {
   // Find last saved txn in MongoDB
   // db.getCollection('dmdtxns').find().sort({blockNumber:-1}).limit(1)
   return dmdTxns
      .find()
      .sort({ blockNumber: -1 })
      .limit(1)
      .exec();
}

function getLastSavedBlockNumber() {
   return getLastSavedTxn()
      .then(docs => {
         // format value
         let result = formatSavedBlockNumber(docs);
         return Promise.resolve(result);
      })
      .catch(err => Promise.reject(err));
}

function formatSavedBlockNumber(docs) {
   // format value
   let lastBlockNumber = 0;
   if (docs.length > 0) {
      lastBlockNumber = docs[0].blockNumber;
   }
   return lastBlockNumber;
}

function saveTxns(lastBlockNumber) {
   return axios.get(dmdUrl).then(function(response) {
      // Parse CryptoID txns
      let parsedTxns = parseRawTxns(response.data.tx);
      let newTxns = parsedTxns.filter(txn => {
         return txn.blockNumber > lastBlockNumber;
      });

      // Create new DMD txn in MongoDB
      dmdTxns
         .create(newTxns)
         .then(newlyCreated => Promise.resolve(newlyCreated));

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
   });
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
