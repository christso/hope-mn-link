var reconTxns = require('../models/reconTxn');

var recon = (function() {
   const getDmdIntervalMatchDef = (fromBlockNumber, toBlockNumber) => {
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

   const getDmdIntervalGroupDef = (fromBlockNumber, toBlockNumber) => {
      return {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
         }
      };
   };

   const dmdTotalByInterval = (fromBlockNumber, toBlockNumber) => {
      return reconTxns.aggregate([
         getDmdIntervalMatchDef(),
         getDmdIntervalGroupDef()
      ]);
   };

   let dmdFindByInterval = (fromBlockNumber, toBlockNumber) => {
      return reconTxns.aggregate([getDmdIntervalMatchDef()]);
   };

   const getHdmdReconMatchDef = reconId => {
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

   let hdmdTotalByRecon = reconId => {
      return reconTxns.aggregate([
         getHdmdReconMatchDef(),
         getHdmdReconGroupDef()
      ]);
   };

   let hdmdFindByRecon = reconId => {
      return reconTxns.aggregate([getHdmdReconMatchDef()]);
   };

   let dmdTotal = () =>
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

   let hdmdTotal = () =>
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

   return {
      dmdTotal: dmdTotal,
      hdmdTotal: hdmdTotal,
      dmdTotalByInterval: dmdTotalByInterval,
      hdmdTotalByRecon: hdmdTotalByRecon
   };
})();

module.exports = {
   recon: recon
};
