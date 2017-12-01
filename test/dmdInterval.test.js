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
const typeConverter = require('../lib/typeConverter');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/dmdIntervalData');
const hdmdEvents = require('../test_modules/hdmdEventModel');
const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const contribs = testData.contributions;
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
      let balances = contribs.amounts.map(value =>
         typeConverter.numberDecimal(value)
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
   function assertBalances(actualHdmdBalances, expectedHdmdBalances, decimals) {
      if (decimals === undefined) {
         decimals = 8;
      }

      assert.equal(
         actualHdmdBalances.length,
         expectedHdmdBalances.length,
         `actualHdmdBalances.length -> expected ${
            actualHdmdBalances.length
         } to equal ${expectedHdmdBalances.length}`
      );

      for (var i = 0; i < expectedHdmdBalances.length; i++) {
         for (var j = 0; j < expectedHdmdBalances[i].length; j++) {
            let expBals = expectedHdmdBalances[i];
            let actBals = actualHdmdBalances[i];
            expBals.forEach(expBal => {
               let actAcc = actBals.filter(actBal => {
                  return expBal.account === actBal.account;
               });
               assert.equal(
                  (a = formatter.round(
                     actAcc[0] ? actAcc[0].balance : null,
                     decimals
                  )),
                  (e = formatter.round(expBal.balance, decimals)),
                  `actualHdmdBalances -> expected ${a} to equal ${e}`
               );
            });
         }
      }
   }

   function assertBlocks(actualHdmdBlocks, expectedHdmdBlocks) {
      assert.equal(
         actualHdmdBlocks.length,
         expectedHdmdBlocks.length,
         `actualHdmdBlocks.length -> expected ${
            actualHdmdBlocks.length
         } to equal ${expectedHdmdBlocks.length}`
      );

      // test individual blocks
      assert.equal(
         (a = JSON.stringify(actualHdmdBlocks)),
         (e = JSON.stringify(expectedHdmdBlocks)),
         `actualHdmdBlocks -> expected ${a} to equal ${e}`
      );
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
      var newReconTxns = testData.reconTxns.map(txn => {
         let newTxn = {};
         Object.assign(newTxn, txn);
         newTxn.amount = typeConverter.numberDecimal(txn.amount);
         return newTxn;
      });

      return dmdIntervals.create(dmdBlockIntervals).then(intervals => {
         return reconTxns.create(newReconTxns);
      });
   });

   it('Gets reconciled HDMD block from DMD block number - 1 DMD steps back', () => {
      const backsteps = 1;

      let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;
      var getIntersects = queries.recon.getDmdIntersects;

      var inputDmdBlocks = [1830, 1829, 1820];
      var expectedHdmdBlocks = [5, 5, 3];

      var actualHdmdBlocks = [];

      var p = Promise.resolve();
      return new Promise((resolve, reject) => {
         inputDmdBlocks.forEach(inputDmdBlock => {
            p = p
               .then(() => {
                  return getHdmdBlockNumFromDmd(inputDmdBlock, backsteps);
               })
               .then(hdmdBlockNum => {
                  actualHdmdBlocks.push(hdmdBlockNum);
               });
         });

         // Assertions
         p
            .then(() => {
               assertBlocks(actualHdmdBlocks, expectedHdmdBlocks); // TODO: why [3,5] ??
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });

   it('Gets reconciled HDMD block from DMD block number - 0 DMD step back', () => {
      const backsteps = 0;

      let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;

      var inputDmdBlocks = [1829, 1820];
      var expectedHdmdBlocks = [7, 5];

      var actualHdmdBlocks = [];

      var p = Promise.resolve();

      return new Promise((resolve, reject) => {
         // Compute Balances
         inputDmdBlocks.forEach(dmdBlockNum => {
            p = p
               .then(() => {
                  return getHdmdBlockNumFromDmd(dmdBlockNum, backsteps);
               })
               .then(hdmdBlockNum => {
                  actualHdmdBlocks.push(hdmdBlockNum);
               });
         });

         // Assertions
         p
            .then(() => {
               assertBlocks(actualHdmdBlocks, expectedHdmdBlocks);
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });

   it('Gets HDMD balances from DMD block number - 1 DMD step back', () => {
      const backsteps = 1;

      let getHdmdBalancesBefore = queries.recon.getHdmdBalancesBefore;
      let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;

      var inputDmdBlocks = [1800, 1810, 1811, 1820, 1829, 1830];
      var expectedHdmdBlocks = [null, 1, 1, 3, 5, 5];
      var expectedHdmdBalances = testData.expectedHdmdBalances_b1;

      var actualHdmdBlocks = [];
      var actualHdmdBalances = [];

      var p = Promise.resolve();

      return new Promise((resolve, reject) => {
         // Compute Balances
         inputDmdBlocks.forEach(dmdBlockNum => {
            p = p
               .then(() => {
                  return getHdmdBlockNumFromDmd(dmdBlockNum, backsteps);
               })
               .then(hdmdBlockNum => {
                  actualHdmdBlocks.push(hdmdBlockNum);
                  return getHdmdBalancesBefore(hdmdBlockNum);
               })
               .then(hdmdBals => {
                  let newHdmdBals = hdmdBals.map(bal => {
                     let newBal = {};
                     Object.assign(newBal, bal);
                     newBal.balance = typeConverter
                        .toBigNumber(bal.balance)
                        .toNumber();
                     return newBal;
                  });
                  return actualHdmdBalances.push(newHdmdBals);
               });
         });

         // Assertions
         p
            .then(() => {
               assertBlocks(actualHdmdBlocks, expectedHdmdBlocks);
               assertBalances(actualHdmdBalances, expectedHdmdBalances);
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });

   it('Creates dmdInterval if balances have changed', () => {
      var didRelativeBalancesChange = reconClient.didRelativeBalancesChange;
      const tolerance = 0.005;
      var inputDmdBlocks = [1800, 1810, 1811, 1820, 1829, 1830];
      var expectedChangeFlags = [false, true, true, true, false, false];

      var actualChangeFlags = [];

      var p = Promise.resolve();

      return new Promise((resolve, reject) => {
         inputDmdBlocks.forEach(dmdBlockNum => {
            p = p
               .then(() => {
                  return didRelativeBalancesChange(dmdBlockNum, tolerance);
               })
               .then(hasChanged => {
                  actualChangeFlags.push(hasChanged);
               });
         });

         // Assertions
         p
            .then(() => {
               assert.equal(
                  (a = JSON.stringify(actualChangeFlags)),
                  (e = JSON.stringify(expectedChangeFlags)),
                  `actualChangeFlags -> expected ${a} to equal ${e}`
               );
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });
});
