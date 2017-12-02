var sinon = require('sinon');
var dmdWallet = require('../client/dmdWallet');
var Logger = require('../lib/logger');
var logger = new Logger();
var DmdDataService = require('../test_modules/dmdDataService');

/**
 * @typedef {<DmdDataService>} DmdDataService
 * @param {DmdDataService} dataService
 */
module.exports = function(dataService) {
   let sandbox = sinon.createSandbox();
   let mocked = sandbox.mock(dmdWallet);

   sandbox
      .stub(mocked.object, 'sendToAddress')
      .callsFake((dmdAddress, value) => {
         logger.log(
            `DMD wallet sendToAddress(${dmdAddress}, ${value}) invoked`
         );

         return Promise.resolve();
      });

   return { mocked: mocked, sandbox: sandbox };
};
