const assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var typeConverter = require('../lib/typeConverter');

const hdmdClient = require('../client/hdmdClient');
const hdmdContract = require('../client/hdmdContract');
const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');
const seeder = require('../client/seeder');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');

const cleanup = true;

describe('HDMD Database Tests', () => {
   var connection;
   const initialSupply = 12000;

   var hdmdContractMock;

   var dmdIntervalsData = [18386, 18388, 18584, 23730].map(b => {
      return { blockNumber: b };
   });

   var reconTxnsData = [
      {
         reconId: '8726d9c0cd1f11e7b529ed384b92c5f0',
         dmdTxnHash:
            'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
         amount: 9000,
         blockNumber: 18386
      },
      {
         reconId: '1766e9c0cd1f11e7b529ed384b92c5f1',
         dmdTxnHash:
            '85D2B4842737DA504E86E7FC202FAA4F6C624E3F05600EC614F45B09C7C15AC7',
         amount: 1000,
         blockNumber: 18387
      }
   ];

   var dmdTxnsData = [
      {
         txnHash:
            'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
         blockNumber: 18386,
         amount: 9000
      },
      {
         txnHash:
            '85D2B4842737DA504E86E7FC202FAA4F6C624E3F05600EC614F45B09C7C15AC7',
         blockNumber: 18387,
         amount: 1000
      },
      {
         txnHash:
            '18086BC1FBBD4C279E84080A537CBC0215133ADA55817BA76C4457C131FACA28',
         blockNumber: 18996,
         amount: 200
      },
      {
         txnHash:
            'F6B85A9B287AF28D21B855740821D00B354FB6CE66C2A316C366A098199ED453',
         blockNumber: 22000,
         amount: 200
      },
      {
         txnHash:
            '107528048D26A9B2D238F37C4DE7050C0C478F2F9FFF2D09012105036E74C720',
         blockNumber: 24742,
         amount: 200
      }
   ];

   var createMocks = () => {
      return new Promise(resolve => {
         resolve();
      });
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

   before(() => {
      return createMocks().then(() => createDatabase());
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase();
      }
      done();
   });

   it('Saves dmdTxns', () => {
      let data = dmdTxnsData.map(txn => {
         let newTxn = {};
         Object.assign(newTxn, txn);
         newTxn.amount = typeConverter.numberDecimal(txn.amount);
         return newTxn;
      });
      return dmdTxns.create(data);
   });

   it('Saves reconTxns', () => {
      let data = reconTxnsData.map(txn => {
         let newTxn = {};
         Object.assign(newTxn, txn);
         newTxn.amount = typeConverter.numberDecimal(txn.amount);
         return newTxn;
      });
      return reconTxns.create(data);
   });

   it('Saves dmdIntervals', () => {
      return dmdIntervals.create(dmdIntervalsData);
   });

   it('Gets the next Block Number in dmdInterval that is greater than the first unmatched dmdTxn', () => {
      var getNextDmdInterval = queries.recon.getNextUnmatchedDmdBlockInterval;
      return getNextDmdInterval().then(nextBlockNumber => {
         assert.equal(nextBlockNumber, dmdIntervalsData[3].blockNumber);
      });
   });
});
