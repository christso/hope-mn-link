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
var testData = require('../test_data/reconIntervalData');
const hdmdEvents = require('../test_modules/hdmdEventModel');

const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const hdmdClientMocker = require('../test_modules/hdmdClientMocker');
const dmdClientMocker = require('../test_modules/dmdClientMocker');

const config = require('../config');

const decimals = config.hdmdDecimals;

const cleanup = false;

describe('Recon Interval Tests', () => {
   const initialSupply = testData.initialSupply;

   // create mock clients
   var hdmdContractMock;
   var hdmdClientMock;
   var hdmdClient;
   var dmdClientMock;
   var dmdClient;
   var downloadTxns;
   var downloadHdmdTxns;

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
   var seedHdmd = () => {
      return seeder.seedHdmd(contribs);
   };

   function createDmdIntervals(data) {
      return dmdIntervals.create(data);
   }

   function getDmdReconTotal(reconId) {
      return reconTxns
         .aggregate([
            {
               $match: {
                  $and: [
                     { dmdTxnHash: { $ne: null } },
                     { dmdTxnHash: { $ne: '' } },
                     { reconId: { $eq: reconId } }
                  ]
               }
            },
            {
               $group: {
                  _id: null,
                  totalAmount: { $sum: '$amount' }
               }
            }
         ])
         .then(grouped => {
            return grouped[0].totalAmount;
         });
   }

   function getHdmdReconTotal(reconId) {
      return reconTxns
         .aggregate([
            {
               $match: {
                  $and: [
                     { hdmdTxnHash: { $ne: null } },
                     { hdmdTxnHash: { $ne: '' } },
                     { reconId: { $eq: reconId } }
                  ]
               }
            },
            {
               $group: {
                  _id: null,
                  totalAmount: { $sum: '$amount' }
               }
            }
         ])
         .then(grouped => {
            return grouped[0].totalAmount;
         });
   }

   function getReconIdFromDmd(dmdBlockNumber) {
      return reconTxns
         .aggregate([
            {
               $match: {
                  $and: [
                     { dmdTxnHash: { $ne: null } },
                     { dmdTxnHash: { $ne: '' } },
                     { blockNumber: { $eq: dmdBlockNumber } }
                  ]
               }
            }
         ])
         .then(recon => {
            return recon[0].reconId;
         });
   }

   // Assert
   function assertTotals(dmdBlockNumber, expectedDmdTotal, expectedHdmdTotal) {
      return getReconIdFromDmd(dmdBlockNumber)
         .then(reconId => {
            return Promise.all([
               getDmdReconTotal(reconId),
               getHdmdReconTotal(reconId)
            ]);
         })
         .then(([dmdTotal, hdmdTotal]) => {
            assert.equal(
               (a = typeConverter.toBigNumber(dmdTotal).toNumber()),
               (e = expectedDmdTotal),
               `dmdTotal`
            );
            assert.equal(
               (a = typeConverter.toBigNumber(hdmdTotal).toNumber()),
               (e = expectedHdmdTotal),
               `hdmdTotal`
            );
         });
   }

   beforeEach(() => {
      hdmdContractMock = hdmdContractMocker(testData.initialSupply);
      hdmdClientMock = hdmdClientMocker(hdmdContractMock.mocked.object);
      hdmdClient = hdmdClientMock.mocked.object;
      dmdClientMock = dmdClientMocker(dmdTxnsData);
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
      done();
   });

   it('Reconciles up to the previous DMD block number - Case 1', () => {
      var dmdIntervals = testData.dmdBlockIntervals;
      let synchronizeAll = reconClient.synchronizeAll;

      // Actions
      let p = createDmdIntervals(dmdIntervals)
         .then(() => downloadTxns())
         .then(() => {
            return synchronizeAll();
         })
         .then(() => {
            return synchronizeAll(); // 2nd iteration will download from hdmdEvents to do the reconciliation
         });

      return p
         .then(() => {
            return assertTotals(18386, 10000, 10000);
         })
         .catch(err => {
            return Promise.reject(err);
         });
   });

   it('Reverse batch transfers before unminting', () => {});
});
