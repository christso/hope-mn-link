const mongodb = require('mongodb');
const BigNumber = require('bignumber.js');

/**
 * Usage:
 * if (!(originalValue instanceof mongodb.Decimal128)) {
         return;
      }
      let bnObj = originalValue.toBigNumber();
 */
function toBigNumber(target) {
   if (target instanceof mongodb.Decimal128) {
      return new BigNumber(new mongodb.Decimal128(target.bytes).toString());
   } else if (typeof target === 'number') {
      return new BigNumber(target.toString());
   } else if (typeof target === 'string') {
      return new BigNumber(target);
   } else {
      throw new Error(`toBigNumber does not support this datatype`);
   }
}

function numberDecimal(target) {
   if (typeof target === 'string') {
      return { $numberDecimal: target };
   } else if (typeof target === 'number') {
      return { $numberDecimal: target.toString() };
   } else if (target instanceof BigNumber) {
      return { $numberDecimal: target.toString() };
   } else {
      return { $numberDecimal: target.toString() };
   }
}

module.exports = {
   numberDecimal: numberDecimal,
   toBigNumber: toBigNumber
};
