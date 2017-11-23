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
      value => new BigNumber(formatter.round(value, decimals))
   );

   // Initial contributions
   return batchTransfer(accounts, balances).catch(err => {
      logger.log(`Error in batch transfer: ${err.stack}`);
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
      .then(() => reconcileTotalSupply())
      .catch(err =>
         Promise.reject(
            new Error(
               `Error retrieving unmatched transactions from MongoDB: ${err}`
            )
         )
      );
}

function reconcileTotalSupply() {
   return getLastSavedDmdBlockInterval()
      .then(dmdBlockNumber => {
         return getUnmatchedTxns(dmdBlockNumber);
      })
      .then(([dmds, hdmds]) => reconcile(dmds, hdmds));
}

module.exports = {
   seedDmd: seedDmd,
   seedHdmd: seedHdmd,
   seedAll: seedAll,
   reconcileTotalSupply: reconcileTotalSupply
};
