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

   var hdmdEventsData = [
      {
         txnHash:
            '0x9e48dcad620045e4796ec8aca03a4f7f279a073fcf3ac701008105b0e34235ee',
         blockNumber: 1,
         amount: 150,
         netAmount: 150,
         eventName: 'Mint'
      }
   ];

   // Fake eth event log
   var hdmdEventSchema = new mongoose.Schema({
      txnHash: String,
      blockNumber: Number,
      amount: Number,
      netAmount: Number,
      eventName: String
   });
   var hdmdEvents = mongoose.model('HdmdEvent', hdmdEventSchema);

   // Fake downloaders
   // No need to download because mintDmdsMock will save directly to MongoDB
   let downloadTxnsFaker = () => {
      return downloadHdmdsFaker();
   };

   let downloadHdmdsFaker = () => {
      return new Promise((resolve, reject) => {
         let getLastHdmdBlockNumberSaved = () => {
            return hdmdTxns
               .find({})
               .sort({ blockNumber: -1 })
               .limit(1)
               .then(found => {
                  return found[0] ? found[0].blockNumber : 0;
               });
         };

         let getHdmdEvents = startBlockNumber => {
            return hdmdEvents.find({
               blockNumber: { $gt: startBlockNumber ? startBlockNumber : 0 }
            });
         };

         let newTxns = [];

         getLastHdmdBlockNumberSaved()
            .then(blockNumber => getHdmdEvents(blockNumber))
            .then(hdmdEvents => {
               hdmdEvents.forEach(event => {
                  newTxns.push({
                     txnHash: event.txnHash,
                     blockNumber: event.blockNumber,
                     amount: event.netAmount,
                     eventName: event.eventName
                  });
               });
               return hdmdTxns.create(newTxns);
            })
            .then(created => {
               resolve(created);
            })
            .catch(err => reject(err));
      });
   };

   var createMocks = () => {
      return new Promise(resolve => {
         let getLastHdmdBlockNumber = () => {
            return hdmdEvents
               .find({})
               .sort({ blockNumber: -1 })
               .limit(1)
               .then(found => (found[0] ? found[0].blockNumber : 0));
         };

         hdmdContractMock = sinon.mock(hdmdContract);
         hdmdClient.init(hdmdContractMock.object);

         sinon.stub(hdmdContractMock.object, 'getTotalSupply').callsFake(() => {
            return new Promise((resolve, reject) => {
               let bnInitSupply = new BigNumber(initialSupply);
               hdmdEvents
                  .find({})
                  .then(found => {
                     if (!found[0]) {
                        return new BigNumber(0);
                     }
                     let total = new BigNumber(0);
                     found.forEach(obj => {
                        total = total.plus(obj.netAmount);
                     });
                     return total;
                  })
                  .then(bnEventTotal => {
                     resolve(bnEventTotal.plus(bnInitSupply));
                     return;
                  })
                  .catch(err => {
                     reject(err);
                  });
            });
         });

         sinon.stub(hdmdContractMock.object, 'unmint').callsFake(amount => {
            let eventAmount = amount ? amount.toNumber() : 0;
            return getLastHdmdBlockNumber().then(blockNumber =>
               hdmdEvents.create({
                  txnHash: formatter.formatUuidv1(uuidv1()),
                  blockNumber: blockNumber + 1,
                  amount: eventAmount,
                  netAmount: eventAmount * -1,
                  eventName: 'Unmint'
               })
            );
         });

         sinon.stub(hdmdContractMock.object, 'mint').callsFake(amount => {
            let eventAmount = amount ? amount.toNumber() : 0;
            return getLastHdmdBlockNumber().then(blockNumber =>
               hdmdEvents.create({
                  txnHash: formatter.formatUuidv1(uuidv1()),
                  blockNumber: blockNumber + 1,
                  amount: eventAmount,
                  netAmount: eventAmount,
                  eventName: 'Mint'
               })
            );
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

   it('Save HDMD events to database', () => {
      return hdmdEvents
         .create(hdmdEventsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Downloads HDMD events into database', () => {
      return downloadHdmdsFaker();
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
      let initialHdmdSavedTotal = 0; // what was saved already in MongoDB
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
               initialSupply +
                  hdmdEventsData[0].netAmount -
                  initialHdmdSavedTotal
            );
         })
         .then(() => hdmdClient.saveTotalSupplyDiff())
         .then(txn => {
            // The amount saved to HDMD should equal the actual initial supply of HDMD
            // This should be the only difference between the hdmdEvents and the total supply
            assert.equal(txn.amount, initialSupply);
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
      let getNextUnmatchedDmdBlockInterval =
         queries.recon.getNextUnmatchedDmdBlockInterval;
      let reconcile = reconClient.reconcile;
      let mintToDmd = reconClient.mintToDmd;
      let dmdReconTotal = queries.recon.getDmdTotal;
      let hdmdReconTotal = queries.recon.getHdmdTotal;
      let nothingToMint = reconClient.nothingToMint;

      let mintNewToDmd = () => {
         let dmds;
         let hdmds;

         return (
            getNextUnmatchedDmdBlockInterval()
               .then(dmdBlockNumber => {
                  return getUnmatchedTxns(dmdBlockNumber - 1);
               })
               // Invoke mint to synchronize HDMDs with DMDs
               .then(values => {
                  dmds = values[0];
                  hdmds = values[1];
                  return mintToDmd(dmds, hdmds); // TODO: create mock mintDmds which will add to MongoDB
               })
               .then(mintTxn => {
                  return [dmds, hdmds, mintTxn];
               })
         );
      };

      let synchronize = i => {
         let minted;
         let dmds;
         let hdmds;
         return (
            // mint amount to sync with DMD
            mintNewToDmd()
               .then(values => {
                  [dmds, hdmds, minted] = values;
                  // download eth event log
                  return downloadHdmdsFaker();
               })
               // reconcile hdmdTxns MongoDB to dmdTxns MongoDB
               .then(created => {
                  if (minted === nothingToMint) {
                     return reconcile(dmds, hdmds);
                  }
               })
               // Save assertion data
               .then(() => {
                  return Promise.all([
                     dmdReconTotal(),
                     hdmdReconTotal()
                  ]).then(([dmds, hdmds]) => {
                     return {
                        dmd: dmds[0] ? dmds[0].totalAmount : 0,
                        hdmd: hdmds[0] ? hdmds[0].totalAmount : 0
                     };
                  });
               })
         );
      };

      // Assert
      let expected = [];
      expected.push({ dmd: 0, hdmd: 0 });
      expected.push({ dmd: 10000, hdmd: 10000 });
      expected.push({ dmd: 10400, hdmd: 10400 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });

      let results = [];

      let p = downloadTxnsFaker();
      for (let i = 0; i < expected.length; i++) {
         p = p.then(() => synchronize(i)).then(result => {
            results.push(result);
         });
      }

      return p.then(() => {
         for (let i = 0; i < results.length; i++) {
            assert.equal(
               results[i].hdmd,
               expected[i].hdmd,
               `Assertion error -> expected HDMD ${results[i]
                  .hdmd} to equal ${expected[i].hdmd} at iteration ${i}`
            );
            assert.equal(
               results[i].dmd,
               expected[i].dmd,
               `Assertion error -> expected DMD ${results[i]
                  .dmd} to equal ${expected[i].dmd} at iteration ${i}`
            );
         }
      });
   });
});
