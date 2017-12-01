const assert = require('chai').assert;
var sinon = require('sinon');
var typeConverter = require('../lib/typeConverter');
var formatter = require('../lib/formatter');

const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const reconTxns = require('../models/reconTxn');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const hdmdClientMocker = require('../test_modules/hdmdClientMocker');
const dmdClientMocker = require('../test_modules/dmdClientMocker');
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/balanceTestData');

const cleanup = false;

describe('HDMD Recon Balance Tests', () => {
   var connection;

   // create mock clients
   var hdmdContractMock;
   var hdmdClientMock;
   var hdmdClient;
   var dmdClientMock;
   var dmdClient;

   const initialSupply = 11000;

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

   before(() => {
      hdmdContractMock = hdmdContractMocker(initialSupply);
      hdmdClientMock = hdmdClientMocker(hdmdContractMock.mocked.object);
      hdmdClient = hdmdClientMock.mocked.object;
      dmdClientMock = dmdClientMocker();
      dmdClient = dmdClientMock.mocked.object;

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

   it('Seed reconTxns to database', () => {
      let data = testData.reconTxnsData;
      return reconTxns
         .create(data)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Gets beginning balance of last reconciled mint', () => {
      let getHdmdBalancesFromDmdBefore =
         reconClient.getHdmdBalancesFromDmdBefore;
      let dmdBlockNumber = null;
      return getHdmdBalancesFromDmdBefore(dmdBlockNumber, 0).then(bals => {
         let bal = formatter.round(
            typeConverter
               .toBigNumber(
                  bals.filter(b => {
                     return (
                        b.account ===
                        '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC'
                     );
                  })[0].balance
               )
               .toNumber(),
            8
         );
         assert.equal(bal, 6602.19318938);
      });
   });

   it('Gets beginning balance from HDMD block number', () => {
      let getHdmdBalancesBefore = queries.recon.getHdmdBalancesBefore;
      return getHdmdBalancesBefore(7).then(bals => {
         let bal = formatter.round(
            typeConverter
               .toBigNumber(
                  bals.filter(b => {
                     return (
                        b.account ===
                        '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC'
                     );
                  })[0].balance
               )
               .toNumber(),
            8
         );
         assert.equal(bal, 6602.19318938);
      });
   });
});
