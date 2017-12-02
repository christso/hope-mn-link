var dmdClient = require('../client/dmdClient');
var sinon = require('sinon');
var dmdTxns = require('../models/dmdTxn');
var typeConverter = require('../lib/typeConverter');

var getLastSavedBlockNumber = dmdClient.getLastSavedBlockNumber;

/**
 * @typedef {({find: () => any, create: ([]) => any})}  DmdTxnDataService
 * @param {DmdTxnDataService} dataService
 * @param {<DmdWallet>} dmdWallet
 */
module.exports = function(dataService, dmdWallet) {
   let sandbox = sinon.createSandbox();
   let mocked = sandbox.mock(dmdClient);

   if (dmdWallet != undefined) {
      dmdClient.init(dmdWallet);
   }

   sandbox.stub(mocked.object, 'downloadTxns').callsFake(() => {
      if (!dataService && !dataService.find()) {
         return [];
      }
      return getLastSavedBlockNumber().then(lastBlockNumber => {
         let data = dataService
            .find()
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

   return { mocked: mocked, sandbox: sandbox, dmdTxnsData: dataService };
};
