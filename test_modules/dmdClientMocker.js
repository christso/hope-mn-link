var dmdClient = require('../client/dmdClient');
var sinon = require('sinon');
var dmdTxns = require('../models/dmdTxn');
var typeConverter = require('../lib/typeConverter');

var getLastSavedBlockNumber = dmdClient.getLastSavedBlockNumber;

module.exports = function(dmdTxnsData, dmdWallet) {
   let sandbox = sinon.createSandbox();
   let mocked = sandbox.mock(dmdClient);

   if (dmdWallet != undefined) {
      dmdClient.init(dmdWallet);
   }

   sandbox.stub(mocked.object, 'downloadTxns').callsFake(() => {
      if (!dmdTxnsData) {
         return [];
      }
      return getLastSavedBlockNumber().then(lastBlockNumber => {
         let data = dmdTxnsData
            .map(txn => {
               let newTxn = {};
               Object.assign(newTxn, txn);
               newTxn.amount = typeConverter.numberDecimal(txn.amount);
               return newTxn;
            })
            .filter(txn => {
               return txn.blockNumber > lastBlockNumber;
            });
         return dmdTxns.create(data);
      });
   });

   return { mocked: mocked, sandbox: sandbox };
};
