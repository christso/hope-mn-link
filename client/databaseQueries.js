var reconTxns = require('../models/reconTxn');
var dmdIntervals = require('../models/dmdInterval');

var recon = (function() {
   let getDmdIntervalMatchDef = (fromBlockNumber, toBlockNumber) => {
      return {
         $match: {
            $and: [
               {
                  blockNumber: { $gte: fromBlockNumber, $lte: toBlockNumber }
               },
               { dmdTxnHash: { $ne: null } }
            ]
         }
      };
   };

   let getDmdIntervalGroupDef = (fromBlockNumber, toBlockNumber) => {
      return {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
         }
      };
   };

   let getDmdTotalByInterval = (fromBlockNumber, toBlockNumber) => {
      return reconTxns.aggregate([
         getDmdIntervalMatchDef(),
         getDmdIntervalGroupDef()
      ]);
   };

   let dmdFindByInterval = (fromBlockNumber, toBlockNumber) => {
      return reconTxns.aggregate([getDmdIntervalMatchDef()]);
   };

   let getHdmdReconMatchDef = reconId => {
      return {
         $match: {
            $and: [{ reconId: reconId }, { hdmdTxnHash: { $ne: null } }]
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

   let getLastDmd = () => {
      return reconTxns
         .find({ dmdTxnHash: { $ne: null } })
         .sort({ blockNumber: -1 })
         .limit(1);
   };

   /**
    * @returns {Promise.<number>} Resolves to the block interval that is greater than the last reconciled block interval
    */
   let getNextDmdInterval = () => {
      return getLastDmd()
         .then(recon => {
            return dmdIntervals
               .find({
                  blockNumber: { $gt: recon[0] ? recon[0].blockNumber : -1 }
               })
               .sort({ blockNumber: 1 })
               .limit(1);
         })
         .then(found => {
            return found[0] ? found[0].blockNumber : -1;
         });
   };

   return {
      getDmdTotal: getDmdTotal,
      getHdmdTotal: getHdmdTotal,
      getDmdTotalByInterval: getDmdTotalByInterval,
      getHdmdTotalByRecon: getHdmdTotalByRecon,
      getLastDmd: getLastDmd,
      getNextDmdInterval: getNextDmdInterval
   };
})();

module.exports = {
   recon: recon
};
