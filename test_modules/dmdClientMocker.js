var dmdClient = require('../client/dmdClient');
var sinon = require('sinon');

module.exports = function() {
   let sandbox = sinon.createSandbox();
   let mocked = sandbox.mock(dmdClient);

   sandbox.stub(mocked.object, 'downloadTxns').callsFake(() => {
      return new Promise((resolve, reject) => {
         resolve();
      });
   });

   return { mocked: mocked, sandbox: sandbox };
};
