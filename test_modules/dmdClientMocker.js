var dmdClient = require('../client/dmdClient');
var sinon = require('sinon');

module.exports = function() {
   let mocked = sinon.mock(dmdClient);
   sinon.stub(mocked.object, 'downloadTxns').callsFake(() => {
      return new Promise((resolve, reject) => {
         resolve();
      });
   });

   return { mocked: mocked };
};
