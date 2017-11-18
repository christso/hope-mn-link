var BigNumber = require('bignumber.js');
var config = require('../config');
var requireSeed = config.requireSeed;

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var dmdClient = require('./dmdClient');
var hdmdClient = require('./hdmdClient');
var reconClient = require('./reconClient');
var allowMinter = hdmdClient.allowMinter;
var defaultAccount = hdmdClient.defaultAccount;
var batchTransfer = hdmdClient.batchTransfer;
var saveTotalSupplyDiff = hdmdClient.saveTotalSupplyDiff;
var downloadTxns = reconClient.downloadTxns;
var getUnmatchedTxns = reconClient.getUnmatchedTxns;
var reconcile = reconClient.reconcile;

var dmdInterval = require('../models/dmdInterval');
const getLastSavedDmdBlockInterval = dmdClient.getLastSavedBlockInterval;
const contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;
const decimals = config.hdmdDecimals;

// Initial contributions
function seedHdmd() {
   let accounts = contribs.accounts;
   let balances = contribs.balances.map(
      value => new BigNumber(Math.round(value, decimals))
   );

   // Initial contributions
   return batchTransfer(accounts, balances).catch(err => {
      console.log(`Error seeding the smart contract: ${err.message}`);
   });
   return p;
}

// Seed DB for DMD Block Intervals
const dmdBlockIntervals = require('../data/dbSeeds').dmdBlockIntervals;

function seedDmd() {
   return dmdInterval.create(dmdBlockIntervals);
}

function seedAll() {
   let p = Promise.resolve();
   if (requireSeed) {
      p = seedDmd()
         .then(() => seedHdmd())
         .then(() => console.log('Seeding successful'))
         .catch(err => Promise.reject(new Error(`Error seeding: ${err}`)));
   }
   return p
      .then(() => downloadTxns())
      .catch(err => Promise.reject(new Error(`Error downloading transactions`)))
      .then(() => saveTotalSupplyDiff()) // TODO: implement (currently 10000 is hard coded)
      .then(() => getLastSavedDmdBlockInterval())
      .then(block => {
         return getUnmatchedTxns(block);
      })
      .then(([dmds, hdmds]) => reconcile(dmds, hdmds))
      .catch(err =>
         Promise.reject(
            new Error(
               `Error retrieving unmatched transactions from MongoDB: ${err}`
            )
         )
      );
}

module.exports = {
   seedDmd: seedDmd,
   seedHdmd: seedHdmd,
   seedAll: seedAll
};
