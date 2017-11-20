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

   var dmdTxnsData = [
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
   ];

   var hdmdTxnsData = [
      {
         txnHash:
            '0x9e48dcad620045e4796ec8aca03a4f7f279a073fcf3ac701008105b0e34235ee',
         blockNumber: 5,
         amount: 150
      }
   ];

   var createMocks = () => {
      return new Promise(resolve => {
         hdmdContractMock = sinon.mock(hdmdContract);
         hdmdClient.init(hdmdContractMock.object);

         sinon.stub(hdmdContractMock.object, 'getTotalSupply').callsFake(() => {
            return Promise.resolve(new BigNumber(initialSupply));
         });

         sinon.stub(hdmdContractMock.object, 'unmint').callsFake(amount => {
            return Promise.resolve(amount);
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
         .create(dmdTxnsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Save HDMDs to database', () => {
      return hdmdTxns
         .create(hdmdTxnsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
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
      let initialHdmdSavedTotal = 0;
      let getTotalSupplyNotSaved = hdmdClient.getTotalSupplyNotSaved;

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
               initialSupply - initialHdmdSavedTotal
            );
         })
         .then(() => hdmdClient.saveTotalSupplyDiff())
         .then(txn => {
            // the amount saved to HDMD should equal the actual initial supply of HDMD
            assert.equal(txn.amount, initialSupply - initialHdmdSavedTotal);
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
         .then(() => reconClient.getLastSavedDmdBlockInterval())
         .then(block => {
            assert.equal(block, dmdBlockIntervals[0].blockNumber);
         });
   });

   it('Mints at each DMD block interval', () => {
      let getUnmatchedTxns = reconClient.getUnmatchedTxns;
      let getLastSavedDmdBlockInterval =
         reconClient.getLastSavedDmdBlockInterval;
      let reconcile = reconClient.reconcile;
      let mintDmds = reconClient.mintDmds;
      let dmdReconTotal = queries.recon.getDmdTotal;
      let hdmdReconTotal = queries.recon.getHdmdTotal;
      let nothingToMint = reconClient.nothingToMint;

      // Fake eth event log
      var hdmdEventSchema = new mongoose.Schema({
         blockNumber: Number
      });
      var hdmdEvents = mongoose.model('HdmdEvent', hdmdEventSchema);

      // No need to download because mintDmdsMock will save directly to MongoDB
      let downloadTxnsFaker = () => {
         return downloadHdmdsFaker();
      };

      let downloadHdmdsFaker = () => {
         return Promise.resolve();
      };

      let synchronize = () => {
         let mintTxn;
         let dmds;
         let hdmds;
         return (
            getLastSavedDmdBlockInterval()
               .then(dmdBlockNumber => getUnmatchedTxns(dmdBlockNumber))
               // Invoke mint to synchronize HDMDs with DMDs
               .then(values => {
                  dmds = values[0];
                  hdmds = values[1];
                  return mintDmds(dmds, hdmds); // TODO: create mock mintDmds which will add to MongoDB
               })
               .then(m => (mintTxn = m))
               // download eth event log
               .then(() => {
                  return downloadHdmdsFaker();
               })
               // reconcile hdmdTxns MongoDB to dmdTxns MongoDB
               .then(() => {
                  return reconcile(dmds, hdmds);
               })
               // Save assertion data
               .then(() => {
                  return Promise.all([
                     dmdReconTotal(),
                     hdmdReconTotal()
                  ]).then(([dmds, hdmds]) => {
                     // return reconId
                     return {
                        dmd: dmds[0] ? dmds[0].totalAmount : 0,
                        hdmd: hdmds[0] ? hdmds[0].totalAmount : 0
                     };
                  });
               })
         );
      };

      // Assert

      let promises = [];
      promises.push(synchronize());
      promises.push(synchronize());
      promises.push(synchronize());
      promises.push(synchronize());

      let expected = [];
      expected.push({ dmd: 10000, hdmd: 10000 });
      expected.push({ dmd: 10400, hdmd: 10400 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });

      return downloadTxnsFaker()
         .then(() => Promise.all(promises))
         .then(results => {
            for (let i = 0; i < results.length; i++) {
               assert.equal(
                  results[i].hdmd,
                  expected[i].hdmd,
                  `Assertion error -> expected ${results[i]
                     .dmd} to equal ${expected[i].hdmd} at iteration ${i}`
               );
               assert.equal(
                  results[i].dmd,
                  expected[i].dmd,
                  `Assertion error -> expected ${results[i]
                     .dmd} to equal ${expected[i].dmd} at iteration ${i}`
               );
            }
         });
   });
});
