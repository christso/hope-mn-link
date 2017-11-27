var typeConverter = require('../lib/typeConverter');

// Seed DB for DMD Block Intervals
var dmdBlockIntervals = [18386, 18584, 23742, 27962, 28022];

var formatBlockIntervals = blockNumbers => {
   return blockNumbers.map(b => {
      return { blockNumber: b };
   });
};

dmdBlockIntervals = formatBlockIntervals(dmdBlockIntervals);

module.exports = {
   dmdBlockIntervals: dmdBlockIntervals
};
