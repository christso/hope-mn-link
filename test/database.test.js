const assert = require('assert');
const hdmdClient = require('../client/hdmdClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');

var database = require('../client/database');

const cleanup = false;

describe('Database Tests', () => {
   var connection;

   before(done => {
      // drop existing db and create new one
      database
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
         .catch(err => console.log(err));
      done();
   });

   after(done => {
      if (cleanup) {
         database.dropDatabase(connection);
      }
   });

   it('Save transactions to database', done => {
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
});
