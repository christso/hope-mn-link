var reconTxns = require('../models/reconTxn');
var dmdTxns = require('../models/dmdTxn');
var dmdIntervals = require('../models/dmdInterval');
var hdmdTxns = require('../models/hdmdTxn');

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

   let getHdmdReconGroupDef = () => {
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
   let getHdmdBalancesBefore = blockNumber => {
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

      if (blockNumber === undefined || blockNumber === null) {
         cmd[0].$match.$and.splice(0, 1); // delete blockNumber
      }

      return reconTxns.aggregate(cmd);
   };

   /**
    * Gets the balance up to and including the specified block
    * @param {Number} blockNumber
    */
   let getHdmdBalances = blockNumber => {
      let cmd = [
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
      ];
      if (blockNumber === undefined || blockNumber === null) {
         cmd[0].$match.$and.splice(0, 1); // delete blockNumber
      }
      return reconTxns.aggregate(cmd);
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
      return getFirstUnmatchedDmd().then(dmd => {
         if (dmd.length === 0) {
            return []; // all dmdTxns reconciled already
         }
         return dmdIntervals
            .aggregate([
               {
                  $match: {
                     blockNumber: { $gt: dmd[0] ? dmd[0].blockNumber : -1 }
                  }
               },
               { $sort: { blockNumber: 1 } }
            ])
            .then(docs => {
               return docs.map(doc => {
                  return doc.blockNumber;
               });
            });
      });
   };

   return {
      getDmdTotal: getDmdTotal,
      getHdmdTotal: getHdmdTotal,
      getNextUnmatchedDmdBlockInterval: getNextUnmatchedDmdBlockInterval,
      getUnmatchedDmdBlockIntervals: getUnmatchedDmdBlockIntervals,
      getHdmdBalances: getHdmdBalances,
      getHdmdBalancesBefore: getHdmdBalancesBefore,
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

   let getMaxIntervalBlockNumber = () => {
      return dmdIntervals.aggregate([
         {
            $group: {
               _id: null,
               maxBlockNumber: { $max: '$blockNumber' }
            }
         }
      ]);
   };

   let getBlockNumbersForIntervals = () => {
      return getMaxIntervalBlockNumber().then(blockNumber => {
         return dmdTxns
            .aggregate([
               {
                  $match: {
                     $and: [{ blockNumber: { $gt: blockNumber } }]
                  }
               },
               {
                  $group: {
                     _id: '$blockNumber'
                  }
               },
               {
                  $project: {
                     blockNumber: '$_id'
                  }
               }
            ])
            .then(docs => {
               return docs.map(doc => {
                  return doc.blockNumber;
               });
            });
      });
   };

   let createBlockIntervals = blockNumbers => {
      var formatted = blockNumbers.map(blockNum => {
         return { blockNumber: blockNum };
      });
   };

   return {
      getNextBlockNumber: getNextBlockNumber,
      getBlockNumbersForIntervals: getBlockNumbersForIntervals,
      createBlockIntervals: createBlockIntervals
   };
})();

var hdmd = (function() {
   let getBalances = () => {
      return hdmdTxns
         .aggregate([
            {
               $group: {
                  _id: '$account',
                  balance: { $sum: '$amount' }
               }
            }
         ])
         .then(docs => {
            return docs.map(doc => {
               return {
                  account: doc._id,
                  balance: doc.balance
               };
            });
         });
   };

   /**
    * Gets the balance up to and including the specified block
    * @param {Number} blockNumber
    */
   let getHdmdBalances = blockNumber => {
      let cmd = [
         {
            $match: {
               $and: [
                  {
                     blockNumber: { $lte: blockNumber }
                  },
                  {}
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
      if (blockNumber === undefined || blockNumber === null) {
         cmd[0].$match.$and.splice(0, 1); // delete blockNumber
      }
      return hdmdTxns
         .aggregate(cmd)
         .then(result => {
            return result;
         })
         .catch(err => {
            return Promise.reject('getHdmdBalances Error: ' + err.message);
         });
   };

   return {
      getBalances: getBalances,
      getHdmdBalances: getHdmdBalances
   };
})();

module.exports = {
   recon: recon,
   dmd: dmd,
   hdmd: hdmd
};
