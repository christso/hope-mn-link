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
const dmdIntervalClient = require('../client/dmdIntervalClient');

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

   var seedDmds = () => {
      let data = testData.dmdTxns.map(txn => {
         let newTxn = {};
         Object.assign(newTxn, txn);
         newTxn.amount = typeConverter.numberDecimal(newTxn.amount);
         return newTxn;
      });
      return dmdTxns.create(data);
   };

   function seedRecons() {
      var newReconTxns = testData.reconTxns.map(txn => {
         let newTxn = {};
         Object.assign(newTxn, txn);
         newTxn.amount = typeConverter.numberDecimal(txn.amount);
         return newTxn;
      });

      return reconTxns.create(newReconTxns);
   }

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

   beforeEach(() => {
      return database.dropCollections([dmdTxns, reconTxns, dmdIntervals]);
   });

   it('Gets reconciled HDMD block from DMD block number - 1 DMD steps back', () => {
      const backsteps = 1;

      let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;
      var getIntersects = queries.recon.getDmdIntersects;

      var inputDmdBlocks = [1830, 1829, 1820];
      var expectedHdmdBlocks = [5, 5, 3];

      var actualHdmdBlocks = [];

      var p = seedDmds().then(() => seedRecons());

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
      p = p
         .then(() => {
            assertBlocks(actualHdmdBlocks, expectedHdmdBlocks); // TODO: why [3,5] ??
         })
         .catch(err => {
            return Promise.reject(err);
         });
      return p;
   });

   it('Gets reconciled HDMD block from DMD block number - 0 DMD step back', () => {
      const backsteps = 0;

      let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;

      var inputDmdBlocks = [1829, 1820];
      var expectedHdmdBlocks = [7, 5];

      var actualHdmdBlocks = [];

      var p = seedDmds().then(() => seedRecons());

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
      p = p
         .then(() => {
            assertBlocks(actualHdmdBlocks, expectedHdmdBlocks); // TODO: why [3,5] ??
         })
         .catch(err => {
            return Promise.reject(err);
         });
      return p;
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

      var p = seedDmds().then(() => seedRecons());

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
      p = p
         .then(() => {
            assertBlocks(actualHdmdBlocks, expectedHdmdBlocks);
            assertBalances(actualHdmdBalances, expectedHdmdBalances);
         })
         .catch(err => {
            return Promise.reject(err);
         });
      return p;
   });

   it('Identifies dmdIntervals where balances have changed', () => {
      var didRelativeBalancesChange =
         dmdIntervalClient.didRelativeBalancesChange;
      const tolerance = 0.005;
      var inputDmdBlocks = [1800, 1810, 1811, 1820, 1829, 1830];
      var expectedChangeFlags = [false, true, true, true, false, false];

      var actualChangeFlags = [];

      var p = seedDmds().then(() => seedRecons());

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
      p = p
         .then(() => {
            assert.equal(
               (a = JSON.stringify(actualChangeFlags)),
               (e = JSON.stringify(expectedChangeFlags)),
               `actualChangeFlags -> expected ${a} to equal ${e}`
            );
         })
         .catch(err => {
            return Promise.reject(err);
         });
      return p;
   });

   it('Saves DMD intervals on changed relative balances', () => {
      // Prepare data
      const tolerance = 0.001;
      let dmdIntervalData = [].map(b => {
         return { blockNumber: b };
      });

      let getDmdIntervalNums = () => {
         return dmdIntervals
            .aggregate([
               {
                  $sort: { blockNumber: 1 }
               }
            ])
            .then(docs => {
               return docs.map(doc => doc.blockNumber);
            });
      };

      let assertDmdIntervals = (actual, expected) => {
         assert.equal(
            (a = actual.length),
            (e = expected.length),
            `length -> expected ${a} to equal ${e}`
         );
         for (let i = 0; i < expected.length; i++) {
            assert.equal(
               (a = actual[i]),
               (e = expected[i]),
               `DmdInterval.blockNumber -> expected ${a} to equal ${e}`
            );
         }
      };

      var p = seedDmds()
         .then(() => seedRecons())
         .then(() => dmdIntervals.create(dmdIntervalData));

      // Actions
      p = p.then(() => dmdIntervalClient.updateBlockIntervals(tolerance));

      // Assert
      let expected = [1810, 1820];
      return p
         .then(() => {
            return getDmdIntervalNums();
         })
         .then(actual => {
            assertDmdIntervals(actual, expected);
         });
   });
});
