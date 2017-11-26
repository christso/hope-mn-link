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

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/integrationData');
const hdmdEvents = require('../test_modules/hdmdEventModel');

const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const hdmdClientMocker = require('../test_modules/hdmdClientMocker');
const dmdClientMocker = require('../test_modules/dmdClientMocker');

const contribs = require('../test_data/hdmdContributions');
const config = require('../config');

const decimals = config.hdmdDecimals;

const cleanup = false;

describe('HDMD Integration Tests', () => {
   const initialSupply = testData.initialSupply;

   // create mock clients
   var hdmdContractMock = hdmdContractMocker(testData.initialSupply);
   var hdmdClient = hdmdClientMocker(hdmdContractMock.mocked.object).mocked
      .object;
   var dmdClient = dmdClientMocker().mocked.object;

   var downloadTxns = reconClient.downloadTxns;
   var downloadHdmdTxns = hdmdClient.downloadTxns;

   var connection;

   var dmdBlockIntervals = testData.dmdBlockIntervals;
   var dmdTxnsData = testData.dmdTxnsData;
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
   var seedHdmds = () => {
      let accounts = contribs.accounts;
      let balances = contribs.amounts.map(
         value => new BigNumber(formatter.toBigNumberPrecision(value))
      );

      // Initial contributions
      return hdmdClient.batchTransfer(accounts, balances).catch(err => {
         logger.log(`Error in batch transfer: ${err.stack}`);
      });
   };

   before(() => {
      return initMocks().then(() => createDatabase());
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase();
      }
      done();
   });

   it('Seed DMDs to database', () => {
      return dmdTxns
         .create(dmdTxnsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Seed HDMD events to database', () => {
      return hdmdEvents
         .create(hdmdEventsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Downloads HDMD events into database', () => {
      return downloadHdmdTxns();
   });

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

      return getHdmdSavedTotal()
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
         .then(() => hdmdClient.saveTotalSupplyDiff(ownerAccount))
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
         });
   });

   it('Get initial DMD block interval', () => {
      return dmdIntervals
         .create(dmdBlockIntervals)
         .then(intervals => {
            assert.notEqual(
               intervals,
               undefined,
               'No intervals were saved to DB'
            );
         })
         .then(() => dmdClient.getLastSavedBlockInterval())
         .then(block => {
            assert.equal(block, dmdBlockIntervals[0].blockNumber);
         });
   });

   it('Mints and apportions at each DMD block interval', () => {
      let dmdReconTotal = queries.recon.getDmdTotal;
      let hdmdReconTotal = queries.recon.getHdmdTotal;
      let synchronizeNext = reconClient.synchronizeNext;

      /**
       * Mint HDMDs up to dmdBlockNumber to make HDMD balance equal to DMD balance
       * @param {Number} dmdBlockNumber - THe maximum DMD Block number that minting will apply up to.
       * @returns {([<DmdTxn>[], <HdmdTxn>[], {Object}])} - DmdTxn[] and HdmdTxn[] are txns that were reconciled
       */
      let mintNewToDmd = reconClient.mintNewToDmd;
      let balancesResult = [];

      let syncTask = () => {
         let balances;
         return (
            synchronizeNext()
               // Save assertion data
               .then(bals => {
                  balancesResult = bals;
                  return Promise.all([
                     dmdReconTotal(),
                     hdmdReconTotal()
                  ]).then(([dmds, hdmds]) => {
                     return {
                        dmd: dmds[0] ? dmds[0].totalAmount : 0,
                        hdmd: hdmds[0] ? hdmds[0].totalAmount : 0,
                        balances: balancesResult
                     };
                  });
               })
         );
      };

      let p = seedHdmds().then(() => {
         return downloadTxns();
      });
      let expectedBals = [
         { dmd: 10000, hdmd: 10000 },
         { dmd: 10400, hdmd: 10400 },
         { dmd: 10600, hdmd: 10600 },
         { dmd: 10600, hdmd: 10600 },
         { dmd: 10600, hdmd: 10600 },
         { dmd: 10600, hdmd: 10600 },
         { dmd: 10600, hdmd: 10600 }
      ];
      let actualBals = [];
      for (let i = 0; i < expectedBals.length; i++) {
         p = p.then(() => syncTask(i)).then(result => {
            actualBals.push(result);
         });
      }

      let assertBals = actualBals => {
         for (let i = 0; i < actualBals.length; i++) {
            assert.equal(
               formatter.round(actualBals[i].hdmd, config.hdmdDecimals),
               formatter.round(expectedBals[i].hdmd, config.hdmdDecimals),
               `Assertion error -> expected HDMD ${actualBals[i]
                  .hdmd} to equal ${expectedBals[i].hdmd} at iteration ${i}`
            );
            assert.equal(
               formatter.round(actualBals[i].dmd, config.hdmdDecimals),
               formatter.round(expectedBals[i].dmd, config.hdmdDecimals),
               `Assertion error -> expected DMD ${actualBals[i]
                  .dmd} to equal ${expectedBals[i].dmd} at iteration ${i}`
            );
         }
      };

      let assertReconAmounts = () => {
         var expectedReconAmounts = testData.expectedReconAmounts;
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
                     _id: { account: '$account', blockNumber: '$blockNumber' },
                     totalAmount: { $sum: '$amount' }
                  }
               },
               {
                  $project: {
                     account: '$_id.account',
                     blockNumber: '$_id.blockNumber',
                     totalAmount: '$totalAmount'
                  }
               },
               {
                  $sort: {
                     blockNumber: 1,
                     account: 1
                  }
               }
            ]);
         };
         return getReconAmounts().then(actuals => {
            for (var i = 0; i < expectedReconAmounts.length; i++) {
               let expected = expectedReconAmounts[i];
               let actual = actuals[i];
               assert.equal(
                  (a = formatter.round(actual.account, config.hdmdDecimals)),
                  (e = formatter.round(expected.account, config.hdmdDecimals)),
                  `Assertion error -> expected recontxn.account ${a} to equal ${e} at iteration ${i}`
               );
               assert.equal(
                  (a = formatter.round(
                     actual.blockNumber,
                     config.hdmdDecimals
                  )),
                  (e = formatter.round(
                     expected.blockNumber,
                     config.hdmdDecimals
                  )),
                  `Assertion error -> expected recontxn.blockNumber ${a} to equal ${e} at iteration ${i}`
               );
               assert.equal(
                  (a = formatter.round(
                     actual.totalAmount,
                     config.hdmdDecimals
                  )),
                  (e = formatter.round(
                     expected.totalAmount,
                     config.hdmdDecimals
                  )),
                  `Assertion error -> expected recontxn.totalAmount ${a} to equal ${e} at iteration ${i}`
               );
            }
         });
      };

      return p
         .then(() => assertBals(actualBals))
         .then(() => assertReconAmounts());
   });
});
