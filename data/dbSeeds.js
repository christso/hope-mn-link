// Seed DB for DMD Block Intervals
var dmdBlockIntervals = [18386, 18584, 23742, 27962, 28022];
dmdBlockIntervals = dmdBlockIntervals.map(b => {
   return { blockNumber: b };
});

module.exports = {
   dmdBlockIntervals: dmdBlockIntervals
};
