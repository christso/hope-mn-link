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
var Logger = require('../lib/logger');
var logger = new Logger('TEST');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');
var testData = require('../test_data/integrationData');
const hdmdEvents = require('../test_modules/hdmdEventModel');
const hdmdContractMocker = require('../test_modules/hdmdContractMocker');
const dloadMocker = require('../test_modules/dloadMocker');
const contribs = require('../test_data/hdmdContributions');
const dmdClient = require('../client/dmdClient');
const config = require('../config');

const decimals = config.hdmdDecimals;

const cleanup = false;

describe('HDMD Integration Tests', () => {
   const initialSupply = testData.initialSupply;
   var hdmdContractMock = hdmdContractMocker(testData.initialSupply);
   var downloadTxnsMock = dloadMocker.downloadTxnsMock;
   var downloadHdmdsMock = dloadMocker.downloadHdmdsMock;

   var connection;

   var dmdBlockIntervals = testData.dmdBlockIntervals;
   var dmdTxnsData = testData.dmdTxnsData;
   var hdmdEventsData = testData.hdmdEventsData;

   var createMocks = () => {
      return hdmdClient.init(hdmdContractMock.object);
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
         value => new BigNumber(formatter.toBigNumberPrecision(value))
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

   it('Seed DMDs to database', () => {
      return dmdTxns
         .create(dmdTxnsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Seed HDMD events to database', () => {
      return hdmdEvents
         .create(hdmdEventsData)
         .then(created => {
            assert.notEqual(created, undefined);
         })
         .catch(err => assert.fail(err));
   });

   it('Downloads HDMD events into database', () => {
      return downloadHdmdsMock();
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
      let ownerAccount = testData.ownerAccount;

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
         .then(() => hdmdClient.saveTotalSupplyDiff(ownerAccount))
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
         .then(() => dmdClient.getLastSavedBlockInterval())
         .then(block => {
            assert.equal(block, dmdBlockIntervals[0].blockNumber);
         });
   });

   it('Mints and apportions at each DMD block interval', () => {
      let getUnmatchedTxns = reconClient.getUnmatchedTxns;
      let getNextUnmatchedDmdBlockInterval =
         queries.recon.getNextUnmatchedDmdBlockInterval;
      let reconcile = reconClient.reconcile;
      let mintToDmd = reconClient.mintToDmd;
      let dmdReconTotal = queries.recon.getDmdTotal;
      let hdmdReconTotal = queries.recon.getHdmdTotal;
      let nothingToMint = reconClient.nothingToMint;
      let getBeginHdmdBalancesFromDmd = reconClient.getBeginHdmdBalancesFromDmd;
      let distributeMint = reconClient.distributeMint;

      /**
       * Mint HDMDs up to dmdBlockNumber to make HDMD balance equal to DMD balance
       * @param {Number} dmdBlockNumber - THe maximum DMD Block number that minting will apply up to.
       * @returns {([<DmdTxn>[], <HdmdTxn>[], {Object}])} - DmdTxn[] and HdmdTxn[] are txns that were reconciled
       */
      let mintNewToDmd = dmdBlockNumber => {
         let dmds;
         let hdmds;
         let minted;

         return (
            getUnmatchedTxns(dmdBlockNumber)
               // Invoke mint to synchronize HDMDs with DMDs
               .then(values => {
                  dmds = values[0];
                  hdmds = values[1];
                  return mintToDmd(dmds, hdmds); // mint the amount that DMD is higher than HDMD
               })
               .then(value => {
                  minted = value;
               })
               .then(() => {
                  return [dmds, hdmds, minted];
               })
         );
      };

      let synchronize = i => {
         let minted;
         let dmds;
         let hdmds;
         let dmdBlockNumber;
         let balancesResult;
         return (
            // mint amount to sync with
            getNextUnmatchedDmdBlockInterval()
               .then(value => {
                  dmdBlockNumber = value;
                  return mintNewToDmd(dmdBlockNumber - 1);
               })
               .then(values => {
                  [dmds, hdmds, minted] = values;
                  // download eth event log
                  return downloadHdmdsMock();
               })
               // reconcile hdmdTxns MongoDB to dmdTxns MongoDB
               .then(saved => {
                  // dmds.amount == hdmds.amount in all cases because mint is done before the reconcile
                  if (minted === nothingToMint) {
                     // TODO: why does the test fail if I reconcile?
                     return reconcile(dmds, hdmds);
                  } else {
                     // what we do if a mint has occured
                     return getUnmatchedTxns(dmdBlockNumber)
                        .then(values => {
                           dmds = values[0];
                           hdmds = values[1];
                           return reconcile(dmds, hdmds);
                        }) // get balance that was reconciled
                        .then(() => {
                           return getBeginHdmdBalancesFromDmd(
                              dmdBlockNumber,
                              0
                           );
                        })
                        .then(balances => {
                           balancesResult = balances;
                           return distributeMint(minted.netAmount, balances);
                        });
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
                        hdmd: hdmds[0] ? hdmds[0].totalAmount : 0,
                        balances: balancesResult
                     };
                  });
               })
         );
      };

      // Assert
      let expectedBals = [
         {
            account: '',
            balance: 2345
         }
      ];

      let expected = [];
      expected.push({ dmd: 10000, hdmd: 10000 });
      expected.push({ dmd: 10400, hdmd: 10400 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });
      expected.push({ dmd: 10600, hdmd: 10600 });

      let results = [];

      let p = seedHdmds().then(() => {
         return downloadTxnsMock();
      });
      for (let i = 0; i < expected.length; i++) {
         p = p.then(() => synchronize(i)).then(result => {
            results.push(result);
         });
      }
      // TODO: remove the round function and see if we can still make the test pass
      return p.then(() => {
         for (let i = 0; i < results.length; i++) {
            assert.equal(
               formatter.round(results[i].hdmd, config.hdmdDecimals),
               formatter.round(expected[i].hdmd, config.hdmdDecimals),
               `Assertion error -> expected HDMD ${results[i]
                  .hdmd} to equal ${expected[i].hdmd} at iteration ${i}`
            );
            assert.equal(
               formatter.round(results[i].dmd, config.hdmdDecimals),
               formatter.round(expected[i].dmd, config.hdmdDecimals),
               `Assertion error -> expected DMD ${results[i]
                  .dmd} to equal ${expected[i].dmd} at iteration ${i}`
            );
         }
      });
   });
});
