var config = require('../config');
var port = config.port;
var axios = require('axios').default;
var dmdTxns = require('../models/dmdTxn');
var mongoose = require('mongoose');
const dmdUrl = config.cryptoidDmdUri;
var hdmdClient = require('../client/hdmdClient');
var dmdInterval = require('../models/dmdInterval');
var typeConverter = require('../lib/typeConverter');
var numberDecimal = typeConverter.numberDecimal;
var dmdWallet = require('../client/dmdWallet');

// Constructor
function init(newDmdWallet) {
   let assign = () => {
      return new Promise(resolve => {
         if (newDmdWallet) {
            dmdWallet = newDmdWallet;
         }
         resolve();
      });
   };
   return assign();
}
init();

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
         amount: numberDecimal(rawTxn[4]),
         balance: numberDecimal(rawTxn[5])
      };
   });
   return newTxns;
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

function getNewTxns(lastBlockNumber) {
   return getParsedTxns().then(parsedTxns => {
      let newTxns = parsedTxns.filter(txn => {
         return txn.blockNumber > lastBlockNumber;
      });
      return newTxns;
   });
}

function saveTxns(newTxns) {
   return dmdTxns.create(newTxns);
}

function downloadTxns() {
   return getLastSavedBlockNumber()
      .then(lastBlockNumber => getNewTxns(lastBlockNumber))
      .then(txns => saveTxns(txns));
}

const unmatchedQueryDefs = {
   lookup: () => {
      return {
         $lookup: {
            from: 'recontxns',
            localField: 'txnHash',
            foreignField: 'dmdTxnHash',
            as: 'recontxns'
         }
      };
   },
   match: () => {
      return {
         $match: {
            recontxns: {
               $eq: []
            }
         }
      };
   },
   group: () => {
      return {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
         }
      };
   }
};

/**
 * get DMD Txns that don't exist in HDMD Txns MongoDB up to and including blockNumber
 * @param {Number} blockNumber
 */
function getUnmatchedTxns(blockNumber) {
   let matchQueryDef = unmatchedQueryDefs.match();

   if (blockNumber) {
      matchQueryDef.$match.blockNumber = { $lte: blockNumber };
   }

   let lookupQueryDef = unmatchedQueryDefs.lookup();
   let groupQueryDef = unmatchedQueryDefs.group();

   let queryDef = [lookupQueryDef, matchQueryDef];

   return dmdTxns.aggregate(queryDef);
}

function getBeginUnmatchedTxns(blockNumber) {
   let matchQueryDef = unmatchedQueryDefs.match();

   if (blockNumber) {
      matchQueryDef.$match.blockNumber = { $lt: blockNumber };
   }

   let lookupQueryDef = unmatchedQueryDefs.lookup();
   let groupQueryDef = unmatchedQueryDefs.group();

   let queryDef = [lookupQueryDef, matchQueryDef];

   return dmdTxns.aggregate(queryDef);
}

function getLastSavedBlockInterval(minBlockNumber) {
   // TODO: the first DMD block is at 18386
   // This will find the minimum dmdBlockInterval that is greater than the last reconciled DMD block.
   let block = minBlockNumber ? minBlockNumber : 0;

   return dmdInterval
      .find({ blockNumber: { $gte: block } })
      .sort({ blockNumber: 1 })
      .limit(1)
      .exec()
      .then(doc => {
         return doc[0].blockNumber;
      });
}

module.exports = {
   downloadTxns: downloadTxns,
   getUnmatchedTxns: getUnmatchedTxns,
   getBeginUnmatchedTxns: getBeginUnmatchedTxns,
   getLastSavedBlockNumber: getLastSavedBlockNumber,
   getLastSavedBlockInterval: getLastSavedBlockInterval,
   formatSavedBlockNumber: formatSavedBlockNumber,
   getLastSavedTxn: getLastSavedTxn,
   getLastSavedBlockNumber: getLastSavedBlockNumber,
   init: init
};
