var reconTxns = require('../models/reconTxn');
var dmdTxns = require('../models/dmdTxn');
var dmdIntervals = require('../models/dmdInterval');

var recon = (function() {
   let getHdmdReconMatchDef = reconId => {
      return {
         $match: {
            $and: [
               { reconId: reconId },
               { hdmdTxnHash: { $ne: '' } },
               { hdmdTxnHash: { $ne: null } }
            ]
         }
      };
   };

   const getHdmdReconGroupDef = () => {
      return {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
         }
      };
   };

   let getHdmdTotalByRecon = reconId => {
      return reconTxns.aggregate([
         getHdmdReconMatchDef(),
         getHdmdReconGroupDef()
      ]);
   };

   let getHdmdBlockByRecon = reconId => {
      return reconTxns.aggregate([
         {
            $match: {
               $and: [
                  {
                     reconId: { $eq: reconId }
                  },
                  { hdmdTxnHash: { $ne: null } },
                  { hdmdTxnHash: { $ne: '' } }
               ]
            }
         },
         {
            $sort: { blockNumber: -1 }
         },
         {
            $limit: 1
         }
      ]);
   };

   /**
    * Get DMD recons where HDMD recons exist, and outputs both block numbers
    */
   let getDmdIntersects = () => {
      return reconTxns.aggregate([
         // select all HDMD recons
         {
            $match: {
               $and: [
                  { dmdTxnHash: { $ne: null } },
                  { dmdTxnHash: { $ne: '' } }
               ]
            }
         },
         // inner join with DMD recons
         {
            $lookup: {
               from: 'recontxns',
               localField: 'reconId',
               foreignField: 'reconId',
               as: 'recons'
            }
         },
         {
            $project: {
               reconId: '$reconId',
               dmdTxnHash: '$dmdTxnHash',
               dmdBlockNumber: '$blockNumber',
               hdmdrecons: {
                  $filter: {
                     input: '$recons',
                     as: 'recon',
                     cond: {
                        $and: [
                           { $ne: ['$$recon.hdmdTxnHash', null] },
                           { $ne: ['$$recon.hdmdTxnHash', ''] },
                           {
                              $eq: [
                                 '$$recon.blockNumber',
                                 { $max: '$$recon.blockNumber' }
                              ]
                           }
                        ]
                     }
                  }
               }
            }
         },
         // flatten
         { $unwind: '$hdmdrecons' },
         // get the maximum hdmdBlockNumber for each dmdBlockNumber
         {
            $project: {
               dmdBlockNumber: '$dmdBlockNumber',
               hdmdBlockNumber: '$hdmdrecons.blockNumber'
            }
         },
         {
            $group: {
               _id: { dmdBlockNumber: '$dmdBlockNumber' },
               hdmdBlockNumber: { $max: '$hdmdBlockNumber' }
            }
         },
         // flatten
         {
            $project: {
               dmdBlockNumber: '$_id.dmdBlockNumber',
               hdmdBlockNumber: '$hdmdBlockNumber'
            }
         },
         {
            $sort: { dmdBlockNumber: -1 }
         }
      ]);
   };

   /**
    * Gets the balance up to and excluding the specified block
    * @param {Number} blockNumber 
    */
   let getBeginHdmdBalancesFromBlock = blockNumber => {
      let cmd = [
         {
            $match: {
               $and: [
                  {
                     blockNumber: { $lt: blockNumber }
                  },
                  { hdmdTxnHash: { $ne: null } },
                  { hdmdTxnHash: { $ne: '' } }
               ]
            }
         },
         {
            $group: {
               _id: '$account',
               balance: { $sum: '$amount' }
            }
         },
         {
            $project: {
               account: '$_id',
               balance: '$balance'
            }
         }
      ];

      // TODO: the below results in failed DMD Interval Test
      if (blockNumber === undefined || blockNumber === null) {
         cmd[0].$match.$and.splice(0, 1); // delete blockNumber
      }

      return reconTxns.aggregate(cmd);
   };

   /**
    * Gets the balance up to and including the specified block
    * @param {Number} blockNumber 
    */
   let getHdmdBalancesFromBlock = blockNumber => {
      return reconTxns.aggregate([
         {
            $match: {
               $and: [
                  {
                     blockNumber: { $lte: blockNumber }
                  },
                  { hdmdTxnHash: { $ne: null } },
                  { hdmdTxnHash: { $ne: '' } }
               ]
            }
         },
         {
            $group: {
               _id: '$account',
               balance: { $sum: '$amount' }
            }
         },
         {
            $project: {
               account: '$_id',
               balance: '$balance'
            }
         }
      ]);
   };

   let hdmdFindByRecon = reconId => {
      return reconTxns.aggregate([getHdmdReconMatchDef()]);
   };

   let getDmdTotal = () =>
      reconTxns.aggregate(
         {
            $match: {
               dmdTxnHash: { $ne: null }
            }
         },
         {
            $group: {
               _id: null,
               totalAmount: { $sum: '$amount' }
            }
         }
      );

   let getHdmdTotal = () =>
      reconTxns.aggregate(
         {
            $match: {
               hdmdTxnHash: { $ne: null }
            }
         },
         {
            $group: {
               _id: null,
               totalAmount: { $sum: '$amount' }
            }
         }
      );

   let getFirstUnmatchedDmd = () => {
      return dmdTxns.aggregate([
         {
            $lookup: {
               from: 'recontxns',
               localField: 'txnHash',
               foreignField: 'dmdTxnHash',
               as: 'recontxns'
            }
         },

         {
            $match: {
               recontxns: {
                  $eq: []
               }
            }
         },
         {
            $sort: {
               blockNumber: 1
            }
         },
         {
            $limit: 1
         }
      ]);
   };

   /**
    * @returns {Promise.<number>} Resolves to the next unreconciled DMD block number 
    */
   let getNextUnmatchedDmdBlockInterval = () => {
      return getFirstUnmatchedDmd()
         .then(dmd => {
            return dmdIntervals.aggregate([
               {
                  $match: {
                     blockNumber: { $gt: dmd[0] ? dmd[0].blockNumber : -1 }
                  }
               },
               { $sort: { blockNumber: 1 } },
               { $limit: 1 }
            ]);
         })
         .then(found => {
            return found[0] ? found[0].blockNumber : undefined;
         });
   };

   /**
    * @returns {Promise.<number>} Resolves to an array of unreconciled DMD block numbers at the end of each interval
    */
   let getUnmatchedDmdBlockIntervals = () => {
      return getFirstUnmatchedDmd()
         .then(dmd => {
            return dmdIntervals.aggregate([
               {
                  $match: {
                     blockNumber: { $gt: dmd[0] ? dmd[0].blockNumber : -1 }
                  }
               },
               { $sort: { blockNumber: 1 } }
            ]);
         })
         .then(docs => {
            return docs.map(doc => {
               return doc.blockNumber;
            });
         });
   };

   return {
      getDmdTotal: getDmdTotal,
      getHdmdTotal: getHdmdTotal,
      getNextUnmatchedDmdBlockInterval: getNextUnmatchedDmdBlockInterval,
      getUnmatchedDmdBlockIntervals: getUnmatchedDmdBlockIntervals,
      getHdmdBalancesFromBlock: getHdmdBalancesFromBlock,
      getBeginHdmdBalancesFromBlock: getBeginHdmdBalancesFromBlock,
      getDmdIntersects: getDmdIntersects
   };
})();

var dmd = (function() {
   let getNextBlockNumber = blockNumber => {
      return dmdIntervals
         .find({ blockNumber: { $gt: blockNumber } })
         .sort({ blockNumber: 1 })
         .limit(1)
         .then(found => {
            return found[0] ? found[0].blockNumber : undefined;
         });
   };
   return { getNextBlockNumber: getNextBlockNumber };
})();

module.exports = {
   recon: recon,
   dmd: dmd
};
