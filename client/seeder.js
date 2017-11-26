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
var contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;
const decimals = config.hdmdDecimals;
const Logger = require('../lib/logger');
const logger = new Logger('Seed');
const formatter = require('../lib/formatter');

// Initial contributions
function seedHdmd(contribData) {
   if (contribData) {
      contribs = contribData;
   }
   let accounts = contribs.accounts;
   let balances = contribs.amounts.map(
      value => new BigNumber(formatter.toBigNumberPrecision(value))
   );

   // Initial contributions
   return batchTransfer(accounts, balances).catch(err => {
      logger.log(`Error in batch transfer: ${err.stack}`);
   });
}

// Seed DB for DMD Block Intervals
const dmdBlockIntervals = require('../data/dbSeeds').dmdBlockIntervals;

function seedDmdIntervals() {
   return dmdInterval.create(dmdBlockIntervals);
}

function seedAll() {
   let p = Promise.resolve();
   if (requireSeed) {
      p = seedDmdIntervals()
         .then(() => seedHdmd())
         .then(() => logger.log('Seeding successful'))
         .catch(err => Promise.reject(new Error(`Error seeding: ${err}`)));
   }
   return p
      .then(() => downloadTxns())
      .catch(err => Promise.reject(new Error(`Error downloading transactions`)))
      .then(() => saveTotalSupplyDiff())
      .catch(err =>
         Promise.reject(
            new Error(
               `Error retrieving unmatched transactions from MongoDB: ${err}`
            )
         )
      );
}

module.exports = {
   seedDmd: seedDmdIntervals,
   seedHdmd: seedHdmd,
   seedAll: seedAll
};
