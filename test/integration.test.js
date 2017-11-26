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

      // Assert
      // TODO: put individual balances here
      let expectedBals = [
         {
            account: '',
            balance: 2345
         }
      ];

      let expected = [];
      expected.push({ dmd: 10000, hdmd: 10000 });
      expected.push({ dmd: 10400, hdmd: 10400 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });

      let results = [];

      let p = seedHdmds().then(() => {
         return downloadTxns();
      });
      for (let i = 0; i < expected.length; i++) {
         p = p.then(() => syncTask(i)).then(result => {
            results.push(result);
         });
      }
      // TODO: remove the round function and see if we can still make the test pass
      return p.then(() => {
         for (let i = 0; i < results.length; i++) {
            assert.equal(
               formatter.round(results[i].hdmd, config.hdmdDecimals),
               formatter.round(expected[i].hdmd, config.hdmdDecimals),
               `Assertion error -> expected HDMD ${results[i]
                  .hdmd} to equal ${expected[i].hdmd} at iteration ${i}`
            );
            assert.equal(
               formatter.round(results[i].dmd, config.hdmdDecimals),
               formatter.round(expected[i].dmd, config.hdmdDecimals),
               `Assertion error -> expected DMD ${results[i]
                  .dmd} to equal ${expected[i].dmd} at iteration ${i}`
            );
         }
      });
   });
});
