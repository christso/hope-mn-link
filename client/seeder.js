var typeConverter = require('../lib/typeConverter');
var BigNumber = require('bignumber.js');
var config = require('../config');
var requireContractSeed = config.requireContractSeed;
var requireDbSeed = config.requireDbSeed;
var syncAfterSeed = config.syncAfterSeed;

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
function seedContract(contribData) {
   if (contribData) {
      contribs = contribData;
   }
   let accounts = contribs.accounts;
   let balances = contribs.amounts.map(
      value => new typeConverter.toBigNumber(value)
   );

   // Initial contributions
   return batchTransfer(accounts, balances).catch(err => {
      throw new Error(`[Seed] Error in batch transfer: ${err.stack}`);
   });
}

// Seed DB for DMD Block Intervals
const dmdBlockIntervals = require('../data/dbSeeds').dmdBlockIntervals;

function seedDmdIntervals() {
   return dmdInterval.create(dmdBlockIntervals);
}

function seedAll() {
   let pDbSeed = () => {
      return seedDmdIntervals()
         .then(() => logger.log('[Seed] Seeded DB.'))
         .catch(err =>
            Promise.reject(new Error(`[Seed] Error seeding DB: ${err}`))
         );
   };

   let pContractSeed = () => {
      return seedContract()
         .then(() => logger.log('[Seed] Seeded contract.'))
         .catch(err =>
            Promise.reject(new Error(`[Seed] Error seeding contract: ${err}`))
         );
   };

   let pTotal = () => {
      return downloadTxns()
         .catch(err =>
            Promise.reject(new Error(`[Seed] Error downloading transactions`))
         )
         .then(() => {
            return saveTotalSupplyDiff();
         })
         .catch(err =>
            Promise.reject(
               new Error(
                  `[Seed] Error retrieving unmatched transactions from MongoDB: ${
                     err
                  }`
               )
            )
         );
   };

   let pSync = () => {
      return reconClient
         .synchronizeAll()
         .then(() => {
            logger.log(`[Seed] Synchronized all txns`);
         })
         .catch(err => {
            return Promise.reject(
               new Error('[Seed] Error Synchronizing all txns')
            );
         });
   };

   return pTotal()
      .then(() => {
         if (requireDbSeed) {
            return pDbSeed();
         }
      })
      .then(() => {
         if (requireContractSeed) {
            return pContractSeed();
         }
      })
      .then(() => {
         if (syncAfterSeed) {
            return pSync();
         }
      });
}

module.exports = {
   seedDmd: seedDmdIntervals,
   seedHdmd: seedContract,
   seedAll: seedAll
};
