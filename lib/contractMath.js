const BigNumber = require('bignumber.js');
const config = require('../config');

module.exports = (function() {
   let decimals = config.hdmdDecimals;

   /**
    * Distributes the minted amount to addresses in proportion to their balances
    * @param {<BigNumber>} amount - amount to distribute
    * @param {<BigNumber>[]} weights - array of weighting values to determine how much each recipient will receive
    * @return {<BigNumber>[]} return value of the smart contract function
    * */
   function applyWeights(amount, weights, decimals) {
      let totalWeight = new BigNumber(0);
      weights.forEach(w => (totalWeight = totalWeight.plus(w)));

      let newAmounts = [];
      weights.forEach(w => {
         newAmounts.push(
            new BigNumber(
               w
                  .times(amount)
                  .dividedBy(totalWeight)
                  .toFixed(decimals)
            )
         );
      });

      if (newAmounts.length === 0) return;

      let totalNewAmount = newAmounts.reduce((a, b) => a.plus(b));
      let discrepancy = amount.minus(totalNewAmount);
      newAmounts[0] = newAmounts[0].plus(discrepancy);

      return newAmounts;
   }

   /**
    * Converts the parsed value to the underlying uint value used by smart contract
    * @param {<BigNumber>} value - parsed value
    * @return {<BigNumber>} - original units
    * */
   function getParsedNumber(value) {
      let divider = new BigNumber(10);
      divider = divider.pow(decimals);
      return value.div(divider);
   }

   /**
    * Converts to underlying uint value used by smart contract
    * @param {<BigNumber>} value - parsed value
    * @return {<BigNumber>} - original units
    */
   function getRawNumber(value) {
      let multiplier = new BigNumber(10);
      multiplier = multiplier.pow(decimals);
      return value.mul(multiplier).round(0);
   }

   return {
      decimals: decimals,
      applyWeights: applyWeights,
      getParsedNumber: getParsedNumber,
      getRawNumber: getRawNumber
   };
})();
