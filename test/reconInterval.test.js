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

   before(() => {
      hdmdContractMock = hdmdContractMocker(testData.initialSupply);
      hdmdClientMock = hdmdClientMocker(hdmdContractMock.mocked.object);
      hdmdClient = hdmdClientMock.mocked.object;
      dmdClientMock = dmdClientMocker();
      dmdClient = dmdClientMock.mocked.object;

      downloadTxns = reconClient.downloadTxns;
      downloadHdmdTxns = hdmdClient.downloadTxns;

      return initMocks().then(() => createDatabase());
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase();
      }
      hdmdContractMock.sandbox.restore();
      hdmdClientMock.sandbox.restore();
      dmdClientMock.sandbox.restore();
      done();
   });
});
