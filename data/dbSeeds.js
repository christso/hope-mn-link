var typeConverter = require('../lib/typeConverter');

// Seed DB for DMD Block Intervals
var dmdBlockIntervals = [
   {
      blockNumber: 18386,
      eventName: 'Mint'
   },
   {
      blockNumber: 18584,
      eventName: 'Mint'
   },
   {
      blockNumber: 23742,
      eventName: 'Mint'
   },
   {
      blockNumber: 27962,
      eventName: 'Burn'
   },
   {
      blockNumber: 28022,
      eventName: 'Mint'
   }
];

module.exports = {
   dmdBlockIntervals: dmdBlockIntervals
};
