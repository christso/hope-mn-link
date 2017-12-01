var BigNumber = require('bignumber.js');

module.exports = (function() {
   /**
    * Remove dashes from uuid
    * @param {String} uuid - UUID to be formated
    * @return {String} formatted UUID
    */
   let formatUuidv1 = uuid => {
      return (
         uuid.substr(0, 8) +
         uuid.substr(9, 4) +
         uuid.substr(14, 4) +
         uuid.substr(19, 4) +
         uuid.substr(24, 12)
      );
   };

   let round = (number, precision) => {
      return parseFloat(new BigNumber(number.toString()).toFixed(precision));
   };

   return {
      formatUuidv1: formatUuidv1,
      round: round
   };
})();
