const assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

const uuidv1 = require('uuid/v1');
const hdmdContract = require('../client/hdmdContract');
const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');
const seeder = require('../client/seeder');
const formatter = require('../lib/formatter');
var Logger = require('../lib/logger');
var logger = new Logger('TEST');
var typeConverter = require('../lib/typeConverter');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/integrationData');
const hdmdEvents = require('../test_modules/hdmdEventModel');

const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const hdmdClientMocker = require('../test_modules/hdmdClientMocker');
const dmdClientMocker = require('../test_modules/dmdClientMocker');
const dmdWalletMocker = require('../test_modules/dmdWalletMocker');
const dmdDataService = require('../test_modules/dmdDataService');

const contribs = testData.contributions;
const config = require('../config');

const decimals = config.hdmdDecimals;

const cleanup = false;

describe('HDMD Integration Tests', () => {
   const initialSupply = testData.initialSupply;

   // create mock clients
   var hdmdContractMock;
   var hdmdClientMock;
   var hdmdClient;
   var dmdClientMock;
   var dmdClient;
   var dmdWalletMock;
   var dmdWallet;
   var downloadTxns;
   var downloadHdmdTxns;

   var connection;

   var dmdBlockIntervals = testData.dmdBlockIntervals;
   var dmdTxnsData = {};
   var hdmdEventsData = testData.hdmdEventsData;

   var initMocks = () => {
      return reconClient.init(dmdClient, hdmdClient);
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
   var seedHdmd = () => {
      return seeder.seedHdmd(contribs);
   };

   beforeEach(() => {
      dmdTxnsData = testData.dmdTxnsData.map(el => el);
      var dataService = dmdDataService(dmdTxnsData);
      hdmdContractMock = hdmdContractMocker(testData.initialSupply);
      hdmdClientMock = hdmdClientMocker(hdmdContractMock.mocked.object);
      hdmdClient = hdmdClientMock.mocked.object;
      dmdWalletMock = dmdWalletMocker(dataService);
      dmdWallet = dmdWalletMock.mocked.object;
      dmdClientMock = dmdClientMocker(dataService, dmdWallet);
      dmdClient = dmdClientMock.mocked.object;

      downloadTxns = reconClient.downloadTxns;
      downloadHdmdTxns = hdmdClient.downloadTxns;
      return initMocks().then(() => createDatabase());
   });

   afterEach(done => {
      if (cleanup) {
         database.dropDatabase();
      }
      hdmdContractMock.sandbox.restore();
      hdmdClientMock.sandbox.restore();
      dmdClientMock.sandbox.restore();
      dmdWalletMock.sandbox.restore();
      done();
   });

   function seedHdmdEvents() {
      let data = hdmdEventsData.map(event => {
         let newEvent = {};
         Object.assign(newEvent, event);
         newEvent.amount = typeConverter.numberDecimal(event.amount);
         newEvent.netAmount = typeConverter.numberDecimal(event.netAmount);
         return newEvent;
      });
      return hdmdEvents
         .create(data)
         .then(created => {
            return Promise.resolve(created);
         })
         .catch(err => Promise.reject(err));
   }

   function syncTask() {
      let synchronizeAll = reconClient.synchronizeAll;
      return downloadTxns().then(() => synchronizeAll());
   }

   function runSynchronizeTestSteps() {
      let saveTotalSupplyDiff = hdmdClient.saveTotalSupplyDiff;
      let ownerAccount = testData.ownerAccount;

      let seedTask = () => {
         return downloadTxns().then(() => saveTotalSupplyDiff(ownerAccount));
      };

      return seedTask()
         .then(() => seedHdmdEvents())
         .then(() => dmdIntervals.create(dmdBlockIntervals))
         .then(() => {
            return seedHdmd();
         })
         .then(() => {
            return syncTask();
         })
         .then(() => {
            return hdmdClient.burn(
               new BigNumber('50'),
               'dQmpKBcneq1ZF27iuJsUm8dQ2QkUriKWy3'
            );
         })
         .then(() => {
            return syncTask();
         })
         .then(() => {
            return syncTask(); // required to redownload DMD chain and reconcile the burn
         });
   }

   function assertReconAmounts(expectedReconAmounts) {
      const decimalTolerance = 2;
      /**
       * Get reconciled HDMD account movements by block number and account
       */
      let getReconAmounts = () => {
         return reconTxns.aggregate([
            {
               $match: {
                  $and: [
                     { hdmdTxnHash: { $ne: null } },
                     { hdmdTxnHash: { $ne: '' } }
                  ]
               }
            },
            {
               $group: {
                  _id: { account: '$account' },
                  totalAmount: { $sum: '$amount' }
               }
            },
            {
               $project: {
                  account: '$_id.account',
                  totalAmount: '$totalAmount'
               }
            },
            {
               $sort: {
                  account: 1
               }
            }
         ]);
      };
      return getReconAmounts().then(actuals => {
         assert.equal(
            (a = actuals.length),
            (e = expectedReconAmounts.length),
            `Assertion error -> expected actuals.length ${a} to equal ${e}`
         );
         for (var i = 0; i < expectedReconAmounts.length; i++) {
            let expected = expectedReconAmounts[i];
            let actual = actuals[i];
            assert.equal(
               (a = actual.account),
               (e = expected.account),
               `Assertion error -> expected recontxn.account ${a} to equal ${
                  e
               } at iteration ${i}`
            );
            assert.equal(
               (a = actual.blockNumber),
               (e = expected.blockNumber),
               `Assertion error -> expected recontxn.blockNumber ${
                  a
               } to equal ${e} at iteration ${i}`
            );
            assert.equal(
               (a = new BigNumber(actual.totalAmount.toString()).toFixed(
                  config.hdmdDecimals - decimalTolerance
               )),
               (e = new BigNumber(expected.totalAmount.toString()).toFixed(
                  config.hdmdDecimals - decimalTolerance
               )),
               `Assertion error -> expected recontxn.totalAmount ${
                  a
               } to equal ${e} at iteration ${i}`
            );
         }
      });
   }

   it('Synchronizes with balance before failed burn', () => {
      dmdWalletMock.setFakeError(true);

      return runSynchronizeTestSteps()
         .then(() => {
            return hdmdClient.mint(new BigNumber('100'));
         })
         .then(() => {
            return syncTask();
         })
         .then(() => {
            return assertReconAmounts(testData.expectedReconAmounts_c2);
         });
   });

   /**
    * Test hdmdClient.saveTotalSupplyDiff(ownerAccount)
    */
   it('Saves HDMD total supply difference to agree hdmdTxns database to blockchain', () => {
      let getHdmdSavedTotal = () => {
         return hdmdTxns.aggregate({
            $group: {
               _id: null,
               totalAmount: { $sum: '$amount' }
            }
         });
      };

      let getTotalSupply = hdmdClient.getTotalSupply;
      let initialHdmdSavedTotal = 0; // what was saved already in MongoDB
      let getTotalSupplyNotSaved = hdmdClient.getTotalSupplyNotSaved;
      let ownerAccount = testData.ownerAccount;

      return dmdIntervals
         .create(dmdBlockIntervals)
         .then(() => seedHdmdEvents())
         .then(() => downloadHdmdTxns())
         .then(() => getHdmdSavedTotal())
         .then(total => {
            return (initialHdmdSavedTotal = total[0]
               ? total[0].totalAmount
               : 0);
         })
         .then(() => getTotalSupplyNotSaved())
         .then(supply => {
            assert.equal(
               supply.toNumber(),
               initialSupply +
                  hdmdEventsData[0].netAmount -
                  initialHdmdSavedTotal
            );
         })
         .then(() => hdmdClient.saveTotalSupplyDiff(ownerAccount)) // This is what we are testing
         .then(txn => {
            // The amount saved to HDMD should equal the actual initial supply of HDMD
            // This should be the only difference between the hdmdEvents and the total supply
            assert.equal(txn.amount, initialSupply);
         })
         .then(() => {
            return Promise.all([getHdmdSavedTotal(), getTotalSupply()]);
         })
         .then(([hdmdTotal, totalSupply]) => {
            assert.equal(
               totalSupply ? totalSupply.toNumber() : 0,
               hdmdTotal[0] ? hdmdTotal[0].totalAmount : 0
            );
         })
         .catch(err => Promise.reject(err));
   });

   it('Synchronizes at each DMD block interval - case: ideal', () => {
      dmdWalletMock.setFakeError(false);

      return runSynchronizeTestSteps().then(() =>
         assertReconAmounts(testData.expectedReconAmounts_c0)
      );
   });

   it('Synchronizes at each DMD block interval - case: wallet error', () => {
      dmdWalletMock.setFakeError(true);

      return runSynchronizeTestSteps().then(() =>
         assertReconAmounts(testData.expectedReconAmounts_c1)
      );
   });
});
