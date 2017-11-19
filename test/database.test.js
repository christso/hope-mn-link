const assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

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

const cleanup = false;

describe('HDMD Database Tests', () => {
   var connection;
   const initialSupply = 12000;

   var hdmdContractMock;

   var dmdIntervalsData = [18386, 18388, 18584, 23742, 27962, 28022].map(b => {
      return { blockNumber: b };
   });

   var reconTxnsData = [
      {
         reconId: '8726d9c0cd1f11e7b529ed384b92c5f0',
         dmdTxnHash:
            'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
         amount: 1000,
         blockNumber: 18389
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

   it('Saves reconTxns', () => {
      return reconTxns.create(reconTxnsData);
   });

   it('Saves dmdIntervals', () => {
      return dmdIntervals.create(dmdIntervalsData);
   });

   it('Gets the last DMD that was reconciled', () => {
      var getLastDmd = queries.recon.getLastDmd;
      return getLastDmd().then(dmdRecon => {
         assert.equal(dmdRecon.length, 1);
         assert.equal(dmdRecon[0].blockNumber, 18389);
      });
   });

   it('Gets the next block interval that is not reconciled', () => {
      var getNextDmdInterval = queries.recon.getNextDmdInterval;
      return getNextDmdInterval().then(dmdInterval => {
         assert.equal(dmdInterval, dmdIntervalsData[2].blockNumber);
      });
   });
});
