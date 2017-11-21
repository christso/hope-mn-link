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

   it('Gets previous HDMD block number from DMD block number', () => {
      let getPrevHdmdBlockByRecon = queries.recon.getPrevHdmdBlockByRecon;
      let getReconByDmdBlock = queries.recon.getReconByDmdBlock;

      var inputDmdBlocks = [1800, 1810, 1820, 1830];
      var expectedHdmdBlocks = [undefined, 2, 4, 5];
      var expectedHdmdBalances = [{}, {}, {}, {}]; // TODO: need to test balances of individual accounts

      var actualHdmdBlocks = [];
      var actualHdmdBalances = [];
      var p = Promise.resolve();

      return new Promise((resolve, reject) => {
         for (var i = 0; i < inputDmdBlocks.length; i++) {
            p = p.then(() =>
               getReconByDmdBlock(inputDmdBlocks[i])
                  .then(recon => {
                     return getPrevHdmdBlockByRecon(recon.reconId);
                  })
                  .then(hdmdBlockNum => {
                     actualHdmdBlocks.push(hdmdBlockNum);
                     return hdmdBlockNum;
                  })
                  .then(hdmdBlockNum => {
                     return getPrevHdmdBlockByRecon(hdmdBlockNum);
                  })
            );
         }

         p
            .then(() => {
               assert.equal(
                  actualHdmdBlocks.length,
                  expectedHdmdBlocks.length,
                  `actualHdmdBlocks.length -> expected ${actualHdmdBlocks.length} to equal ${expectedHdmdBlocks.length}`
               );
               assert.equal(
                  actualHdmdBalances.length,
                  expectedHdmdBalances.length,
                  `actualHdmdBalances.length -> expected ${actualHdmdBlocks.length} to equal ${expectedHdmdBalances.length}`
               );

               // TODO: test individual values not just how many were processed
               resolve();
            })
            .catch(err => {
               reject(err);
            });
      });
   });
});
