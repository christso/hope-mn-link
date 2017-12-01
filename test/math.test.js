const assert = require('chai').assert;
const hdmdClient = require('../client/hdmdClient');
const BigNumber = require('bignumber.js');

describe('HDMD calculation tests', () => {
   it('applyWeights outputs total amount that equals the input amount - CASE 1', () => {
      // test if the total amounts equal with the base amount
      const amount = new BigNumber(58.045);
      const weights = [
         262.5396528,
         17.37530383,
         119.33620582,
         32.88905832,
         1193.36205816,
         47.73448233,
         119.33620582,
         119.33620582,
         1202.90895463,
         1200.04488569,
         553.71999499,
         1288.83102282,
         119.33620582,
         2670.68499514,
         143.20344698,
         477.34482327,
         238.67241163,
         83.55477678,
         109.78930935,
         0
      ].map(w => new BigNumber(w));

      let newAmounts = hdmdClient.applyWeights(amount, weights, 8);
      let totalNewAmount = new BigNumber(0);
      newAmounts.forEach(a => {
         totalNewAmount = totalNewAmount.plus(a);
      });

      assert.equal(amount.minus(totalNewAmount), 0);
      return Promise.resolve();
   });

   it('applyWeights outputs total amount that equals the input amount - CASE 2', done => {
      // test if the total amounts equal with the base amount
      const amount = new BigNumber(10000);
      const weights = [
         0,
         2670.68499516765,
         477.344823265084,
         1288.83102281573,
         553.719994987497,
         1200.04488568842,
         83.5547767791448,
         1202.90895462801,
         109.789309350969,
         119.336205816271,
         143.203446979525,
         47.7344823265084,
         1193.36205816271,
         238.672411632542,
         119.336205816271,
         119.336205816271,
         17.3753038323667,
         119.336205816271,
         32.8890583229643,
         262.539652795796
      ].map(w => new BigNumber(w));

      let weightedAmount = hdmdClient.applyWeights(amount, weights);
      let totalWeightedAmount = new BigNumber(0);
      weightedAmount.forEach(a => {
         totalWeightedAmount = totalWeightedAmount.plus(a);
      });
      assert.equal(totalWeightedAmount.toNumber(), amount.toNumber());
      done();
   });
});
