var sinon = require('sinon');
var dmdWallet = require('../client/dmdWallet');
var Logger = require('../lib/logger');
var logger = new Logger();
var DataService = require('../test_modules/dmdDataService');
const BigNumber = require('bignumber.js');

/**
 * @typedef {({find: () => any, create: ([]) => any})}  DmdTxnDataService
 * @param {DmdTxnDataService} dataService
 */
module.exports = function(dataService) {
   if (!dataService) {
      dataService = DataService([]);
   }

   let sandbox = sinon.createSandbox();
   let mocked = sandbox.mock(dmdWallet);

   sandbox
      .stub(mocked.object, 'sendToAddress')
      .callsFake((dmdAddress, value) => {
         var newValue = new BigNumber(value);
         if (newValue.lessThan(0)) {
            throw new Error('dmdWalletError: cannot send negative amount.');
         }
         logger.log(
            `DMD wallet sendToAddress(${dmdAddress}, ${newValue}) invoked`
         );

         let created = dataService.create({
            amount: newValue.times(-1)
         });
         return Promise.resolve(created);
      });

   return { mocked: mocked, sandbox: sandbox };
};
