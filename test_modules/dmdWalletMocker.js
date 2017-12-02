var sinon = require('sinon');
var dmdWallet = require('../client/dmdWallet');
var Logger = require('../lib/logger');
var logger = new Logger();

module.exports = function() {
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
