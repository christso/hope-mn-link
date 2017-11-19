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

var database = require('../client/database');

const cleanup = false;

describe('HDMD Database Tests', () => {
   var connection;
   const initialSupply = 12000;

   var hdmdContractMock;

   var dmdBlockIntervals = [18386, 18584, 23742, 27962, 28022].map(b => {
      return { blockNumber: b };
   });

   var createMocks = () => {
      hdmdContractMock = sinon.mock(hdmdContract);
      hdmdClient.init(hdmdContractMock.object);

      sinon.stub(hdmdContractMock.object, 'getTotalSupply').callsFake(() => {
         return Promise.resolve(new BigNumber(initialSupply));
      });
   };

   var createDatabase = done => {
      // drop existing db and create new one
      return database
         .createTestConnection()
         .then(c => {
            connection = c;
            database.dropDatabase(connection);
         })
         .then(() => database.disconnect(connection))
         .then(() => database.createTestConnection())
         .then(c => {
            connection = c;
         })
         .then(done, done);
   };

   before(done => {
      createMocks();
      createDatabase(done).catch(err => console.log(err));
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase(connection);
      }
      done();
   });

   it('Save DMDs to database', done => {
      dmdTxns
         .create([
            {
               txnHash:
                  'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
               blockNumber: 18386,
               amount: 10000
            },
            {
               txnHash:
                  '18086BC1FBBD4C279E84080A537CBC0215133ADA55817BA76C4457C131FACA28',
               blockNumber: 18996,
               amount: 1.5
            }
         ])
         .then(created => {
            assert.notEqual(created, undefined);
            done();
         })
         .catch(err => assert.fail(err));
   });

   it('Save HDMDs to database', done => {
      done();
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
         .then(() => reconClient.getLastSavedDmdBlockInterval())
         .then(block => {
            assert.equal(block, dmdBlockIntervals[0].blockNumber);
         });
   });

   it('Saves HDMD total supply difference to agree database to blockchain', () => {
      return hdmdClient
         .getTotalSupplyNotSaved()
         .then(supply => {
            assert.equal(supply.toNumber(), initialSupply);
         })
         .then(() => hdmdClient.saveTotalSupplyDiff())
         .then(txn => {
            assert.equal(txn.amount, initialSupply);
         });
   });
});
