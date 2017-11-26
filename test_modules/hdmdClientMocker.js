var sinon = require('sinon');
const uuidv1 = require('uuid/v1');
const BigNumber = require('bignumber.js');
const hdmdTxns = require('../models/hdmdTxn');
const hdmdEvents = require('../test_modules/hdmdEventModel');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const formatter = require('../lib/formatter');
const hdmdClient = require('../client/hdmdClient');

module.exports = function(newHdmdContract) {
   let mocked = sinon.mock(hdmdClient);
   if (newHdmdContract) {
      hdmdClient.init(newHdmdContract);
   }
   sinon.stub(mocked.object, 'downloadTxns').callsFake(() => {
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
                     account: event.account,
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
   });

   return { mocked: mocked };
};
