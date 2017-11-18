const assert = require('assert');
const hdmdClient = require('../client/hdmdClient');
const BigNumber = require('bignumber.js');

describe('HDMD calculation tests', () => {
   it('applyWeights outputs total amount that equals the input amount', done => {
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
         totalWeightedAmount = totalWeightedAmount.add(a);
      });
      assert.equal(totalWeightedAmount.toNumber(), amount.toNumber());
      done();
   });
});
