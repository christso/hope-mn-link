var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const hdmdEvents = require('../test_modules/hdmdEventModel');

module.exports = (function() {
   // Fake downloaders
   // No need to download because mintDmdsMock will save directly to MongoDB
   let downloadTxnsMock = () => {
      return downloadHdmdsMock();
   };

   let downloadHdmdsMock = () => {
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
   return {
      downloadTxnsMock: downloadTxnsMock,
      downloadHdmdsMock: downloadHdmdsMock
   };
})();
