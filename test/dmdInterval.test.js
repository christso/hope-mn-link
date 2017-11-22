const assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

const uuidv1 = require('uuid/v1');
const hdmdClient = require('../client/hdmdClient');
const hdmdContract = require('../client/hdmdContract');
const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');
const seeder = require('../client/seeder');
const formatter = require('../lib/formatter');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/dmdIntervalData');
const hdmdEvents = require('../test_modules/hdmdEventModel');
const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const dloadMocker = require('../test_modules/dloadMocker');
const contribs = require('../test_data/hdmdContributions');
const noBlockNumber = -1;

const cleanup = false;

describe('DMD Interval Tests', () => {
   var connection;

   var dmdBlockIntervals = testData.dmdBlockIntervals;

   var createMocks = () => {
      return Promise.resolve();
   };

   var createDatabase = done => {
      // drop existing db and create new one
      return database
         .dropAndCreateTestDatabase()
         .then(c => {
            undefined;
         })
         .then(done, done);
   };

   // Initial contributions
   var seedHdmds = () => {
      let accounts = contribs.accounts;
      let balances = contribs.amounts.map(
         value => new BigNumber(Math.round(value, decimals))
      );

      // Initial contributions
      return hdmdClient.batchTransfer(accounts, balances).catch(err => {
         logger.log(`Error in batch transfer: ${err.stack}`);
      });
   };

   /**
      * test individual balances (much better than JSON.stringify)
      * @param {<HdmdBalances>} actualHdmdBalances 
      * @param {<HdmdBalances>} expectedHdmdBalances 
      */
   function assertBalances(actualHdmdBalances, expectedHdmdBalances) {
      for (var i = 0; i < expectedHdmdBalances.length; i++) {
         for (var j = 0; j < expectedHdmdBalances[i].length; j++) {
            let expBals = expectedHdmdBalances[i];
            let actBals = actualHdmdBalances[i];
            expBals.forEach(expBal => {
               let actAcc = actBals.filter(actBal => {
                  return expBal.account === actBal.account;
               });
               assert.equal(
                  (a = expBal.account),
                  (b = actAcc[0].account),
                  `actualHdmdBalances -> expected ${a} to equal ${e}`
               );
            });
         }
      }
   }

   before(() => {
      return createMocks().then(() => createDatabase());
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase();
      }
      done();
   });

   it('Seeds databases', () => {
      return dmdIntervals.create(dmdBlockIntervals).then(intervals => {
         return reconTxns.create(testData.reconTxns);
      });
   });

   it('Gets HDMD balances at 1 interval ago from DMD block number', () => {
      let getHdmdBlocksByRecon = queries.recon.getHdmdBlocksUpToRecon;
      let getReconByDmdBlock = queries.recon.getReconByDmdBlock;
      let getHdmdBalancesByBlock = queries.recon.getHdmdBalancesByBlock;
      let getHdmdBlocksUpToRecon = queries.recon.getHdmdBlocksUpToRecon;

      var inputDmdBlocks = [1800, 1810, 1811, 1820, 1830];
      var expectedHdmdBlocks = [null, 2, 3, 4, 5];
      var expectedHdmdBalances = testData.expectedHdmdBalances;

      var actualHdmdBlocks = [];
      var actualHdmdBalances = [];

      var p = Promise.resolve();
      var dmdBlockNumber;

      return new Promise((resolve, reject) => {
         // Compute Balances
         inputDmdBlocks.forEach(inputDmdBlock => {
            p = p
               .then(() => {
                  return getReconByDmdBlock(inputDmdBlock);
               })
               .then(recon => {
                  // if inputDmdBlock greater than max(reconTxns.dmdBlock), get current
                  dmdBlockNumber = recon[0] ? recon[0].blockNumber : null;
                  return getHdmdBlocksUpToRecon(
                     recon[0].reconId
                  ).then(hdmdBlocks => {
                     return hdmdBlocks ? hdmdBlocks : [];
                  });
               })
               .then(hdmdBlocks => {
                  let lookBack = 1;
                  if (inputDmdBlock > dmdBlockNumber) {
                     lookBack = 0;
                  }
                  let hdmdBlockNum = hdmdBlocks[lookBack]
                     ? hdmdBlocks[lookBack].blockNumber
                     : null;
                  actualHdmdBlocks.push(hdmdBlockNum);
                  return hdmdBlockNum;
               })
               .then(hdmdBlockNum => {
                  return getHdmdBalancesByBlock(hdmdBlockNum);
               })
               .then(hdmdBals => {
                  return actualHdmdBalances.push(hdmdBals);
               });
         });

         // Assertions
         p
            .then(() => {
               // test how many where processed
               assert.equal(
                  actualHdmdBlocks.length,
                  expectedHdmdBlocks.length,
                  `actualHdmdBlocks.length -> expected ${actualHdmdBlocks.length} to equal ${expectedHdmdBlocks.length}`
               );
               assert.equal(
                  actualHdmdBalances.length,
                  expectedHdmdBalances.length,
                  `actualHdmdBalances.length -> expected ${actualHdmdBalances.length} to equal ${expectedHdmdBalances.length}`
               );

               // test individual blocks
               assert.equal(
                  (a = JSON.stringify(actualHdmdBlocks)),
                  (e = JSON.stringify(expectedHdmdBlocks)),
                  `actualHdmdBlocks -> expected ${a} to equal ${e}`
               );
               // test individual balances
               assertBalances(actualHdmdBalances, expectedHdmdBalances);
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });

   it('Gets HDMD balances at 2 intervals ago from DMD block number', () => {
      let getHdmdBlocksByRecon = queries.recon.getHdmdBlocksUpToRecon;
      let getReconByDmdBlock = queries.recon.getReconByDmdBlock;
      let getHdmdBalancesByBlock = queries.recon.getHdmdBalancesByBlock;
      let getHdmdBlocksUpToRecon = queries.recon.getHdmdBlocksUpToRecon;

      var inputDmdBlocks = [1800, 1810, 1811, 1820, 1830];
      var expectedHdmdBlocks = [null, 1, 2, 3, 4];
      var expectedHdmdBalances = testData.expectedHdmdBalances;

      var actualHdmdBlocks = [];
      var actualHdmdBalances = [];

      var p = Promise.resolve();

      return new Promise((resolve, reject) => {
         reject(new Error('TODO'));
      });
   });
});
