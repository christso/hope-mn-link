module.exports = (function() {
   const initialSupply = 12000;

   var dmdBlockIntervals = [18386, 18388, 18584, 23730].map(b => {
      return { blockNumber: b };
   });

   return {
      dmdBlockIntervals: dmdBlockIntervals
   };
})();
