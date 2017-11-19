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

describe('HDMD Integration Tests', () => {
   var connection;
   const initialSupply = 12000;

   var hdmdContractMock;

   var dmdBlockIntervals = [18386, 18388, 18584, 23742, 27962, 28022].map(b => {
      return { blockNumber: b };
   });

   var createMocks = () => {
      return new Promise(resolve => {
         hdmdContractMock = sinon.mock(hdmdContract);
         hdmdClient.init(hdmdContractMock.object);

         sinon.stub(hdmdContractMock.object, 'getTotalSupply').callsFake(() => {
            return Promise.resolve(new BigNumber(initialSupply));
         });

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

   it('Save DMDs to database', () => {
      return dmdTxns
         .create([
            {
               txnHash:
                  'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
               blockNumber: 18386,
               amount: 9000
            },
            {
               txnHash:
                  'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
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
                  'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
               blockNumber: 22000,
               amount: 200
            },
            {
               txnHash:
                  'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
               blockNumber: 24742,
               amount: 200
            }
         ])
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Save HDMDs to database', () => {
      return Promise.reject('TODO');
   });

   it('Saves HDMD total supply difference to agree database to blockchain', () => {
      let getDmdTotal = () => {
         return dmdTxns.aggregate({
            $group: {
               _id: null,
               totalAmount: { $sum: '$amount' }
            }
         });
      };

      let getHdmdTotal = () => {
         return hdmdTxns.aggregate({
            $group: {
               _id: null,
               totalAmount: { $sum: '$amount' }
            }
         });
      };

      return hdmdClient
         .getTotalSupplyNotSaved()
         .then(supply => {
            assert.equal(supply.toNumber(), initialSupply);
         })
         .then(() => hdmdClient.saveTotalSupplyDiff())
         .then(txn => {
            // the amount saved to HDMD should equal the actual initial supply of HDMD
            assert.equal(txn.amount, initialSupply);
         })
         .then(() => {
            return Promise.all([getDmdTotal(), getHdmdTotal()]);
         })
         .then(([dmdTotal, hdmdTotal]) => {
            assert.equal(
               dmdTotal[0] ? dmdTotal[0].totalAmount : 0,
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
         .then(() => reconClient.getLastSavedDmdBlockInterval())
         .then(block => {
            assert.equal(block, dmdBlockIntervals[0].blockNumber);
         });
   });

   it('HdmdTxns should equal DmdTxns in ReconTxns after saving HDMD total supply difference', () => {
      let getUnmatchedTxns = reconClient.getUnmatchedTxns;
      let getLastSavedDmdBlockInterval =
         reconClient.getLastSavedDmdBlockInterval;
      let reconcile = reconClient.reconcile;

      let getDmdReconTotal = queries.recon.getDmdTotal;
      let getHdmdReconTotal = queries.recon.getHdmdTotal;

      return seeder.reconcileTotalSupply().then(newRecons => {
         return Promise.all([
            getDmdReconTotal(),
            getHdmdReconTotal()
         ]).then(([dmds, hdmds]) => {
            assert.equal(dmds[0].totalAmount, hdmds[0].totalAmount);
         });
      });
   });

   it('Mints current DMD block interval only', () => {
      let getUnmatchedTxns = reconClient.getUnmatchedTxns;
      let getLastSavedDmdBlockInterval =
         reconClient.getLastSavedDmdBlockInterval;
      let reconcile = reconClient.reconcile;
      let mintDmds = reconClient.mintDmds;
      let dmdReconTotal = queries.recon.getDmdTotal;
      let hdmdReconTotal = queries.recon.getHdmdTotal;

      // No need to download because mintDmdsMock will save directly to MongoDB
      let downloadTxns = () => {
         return Promise.resolve();
      };

      let promises = [];
      let amounts = [];

      let synchronizeAll = () => {
         return (
            downloadTxns()
               .then(() => getLastSavedDmdBlockInterval())
               .then(dmdBlockNumber => getUnmatchedTxns(dmdBlockNumber))
               // Invoke mint to synchronize HDMDs with DMDs
               .then(([dmds, hdmds]) => {
                  return mintDmds(dmds, hdmds); // TODO: create mock mintDmds which will add to MongoDB
               })
               // Assert
               .then(mintTxn => {
                  return Promise.all([
                     dmdReconTotal(),
                     hdmdReconTotal()
                  ]).then(([dmds, hdmds]) => {
                     amounts.push({
                        dmd: dmds[0].totalAmount,
                        hdmd: hdmds[0].totalAmount
                     });
                  });
               })
         );
      };

      dmdIntervals.aggregate();

      for (let i = 0; i < 2; i++) {
         promises.push(synchronizeAll());
      }

      return Promise.all(promises).then(results => {
         for (let i = 0; i < amounts.length; i++) {
            assert.equal(
               amounts[i].dmd,
               amounts[i].hdmd,
               `Assertion error -> expected ${amounts[i]
                  .dmd} to equal ${amounts[i].hdmd} at iteration ${i}`
            );
         }
      });
   });
});
