//dmdTxnDataService

const uuidv4 = require('uuid/v4');
const formatter = require('../lib/formatter');

module.exports = function(seedData) {
   if (seedData === undefined) {
      throw new Error('dmdDataServiceError: seedData is not defined');
   }
   let _txns = seedData;

   function find() {
      return _txns;
   }

   /**
    * @typedef {({txnHash: string, blockNumber: number, amount: {<BigNumber>})} DmdTxn
    * @param {DmdTxn} txn
    */
   function create(txn) {
      let newTxn = {};
      Object.assign(newTxn, txn);

      if (newTxn.txnHash === undefined) {
         newTxn.txnHash = formatter.formatUuidv1(uuidv4());
      }

      if (newTxn.blockNumber === undefined) {
         let maxBlockNumber = _txns
            .map(_txn => {
               return _txn.blockNumber;
            })
            .reduce((a, b) => {
               if (a > b) {
                  return a;
               } else {
                  return b;
               }
            });
         newTxn.blockNumber = maxBlockNumber + 1;
      }
      _txns.push(newTxn);

      return newTxn;
   }

   return {
      data: _txns,
      find: find,
      create: create
   };
};
