# MongoDB Commands

Get dmdTxns sorted decending by blockNumber
```
db.getCollection('dmdtxns').find({}).sort({blockNumber:-1})
```

Join from dmdTxns to hdmdTxns using condition dmdTxns.txnHash == hdmdTxns.dmdTxnHash
```
db.getCollection('dmdtxns').aggregate({$lookup: 
    {
        from: 'hdmdtxns',
        localField: 'txnHash',
        foreignField: 'dmdTxnHash',
        as: 'hdmddocs'
    }
})
```

Find HDMDs in reconTxns collection
```
db.getCollection('recontxns').find({hdmdTxnHash: { $ne: null }}).sort({blockNumber:-1})
```

Get HDMDs in reconTxns and the associated DMD
```
db.getCollection('recontxns').aggregate([
// select all HDMD recons
{ 
    $match: { $and: [ 
        { hdmdTxnHash: { $ne: null } },
        { hdmdTxnHash: { $ne: '' } }
    ] } 
},
// inner join with DMD recons
{
    $lookup:
    {
        from: "recontxns",
        localField: "reconId",
        foreignField: "reconId",
        as: "recontxns"
    }
},
{
    $project: {
        reconId: '$reconId',
        hdmdTxnHash: '$hdmdTxnHash',
        hdmdBlockNumber: '$blockNumber',
        dmdrecons: {
            $filter: {
                input: '$recontxns',
                as: 'recon',
                cond: { $and: [
                    { $ne: [ '$$recon.dmdTxnHash', null ] },
                    { $ne: [ '$$recon.dmdTxnHash', ''] }
                ]}
            }
        }
    }
},
// reformat
{ $unwind : "$dmdrecons" },
{
    $project: {
        reconId: '$reconId',
        hdmdTxnHash: '$hdmdTxnHash',
        hdmdBlockNumber: '$hdmdBlockNumber',
        dmdTxnHash: '$dmdrecons.dmdTxnHash',
        dmdBlockNumber: '$dmdrecons.blockNumber'
    }
},
{
    $sort: { dmdBlockNumber: -1 }
}
])
```

Get DMDs in reconTxns and the most latest associated HDMD.
```
db.getCollection('recontxns').aggregate([
   // select all HDMD recons
   {
      $match: {
         $and: [{ dmdTxnHash: { $ne: null } }, { dmdTxnHash: { $ne: '' } }]
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
])
```

Get reconciled HDMD account movements by block number and account
```
db.getCollection('recontxns').aggregate([
{
    $match: { $and: [ 
        { hdmdTxnHash: { $ne: null } },
        { hdmdTxnHash: { $ne: '' } }
    ] }
},
{
  $group: {
           _id : { account: '$account', blockNumber: '$blockNumber' },
           totalAmount: { $sum: '$amount' }
        }
},
{
  $project: {
      account: '$_id.account',
      blockNumber: '$_id.blockNumber',
      totalAmount: '$totalAmount'
  }
},
{
   $sort: {
       blockNumber: 1
   }
}])
```

Get the latest reconTxn from dmdBlockNumber
```
/**
* Get the latest reconTxn from dmdBlockNumber
* @param {Number} bn - DMD Block Number 
*/

function getReconByDmdBlock(bn) {
   return db.getCollection('recontxns').aggregate([
      {
         $match: {
            $and: [
               { blockNumber: { $lte: bn } },
               { dmdTxnHash: { $ne: '' } },
               { dmdTxnHash: { $ne: null } }
            ]
         }
      },
      {
         $sort: {
            blockNumber: -1
         }
      },
      {
         $limit: 1
      }
   ]);
}

getPrevReconByDmdBlock(bn);
```

Get HDMD recons up to block number 10
```
var reconTxns = db.getCollection('recontxns');

/**
* @param {Number} blockNumber - Get HDMD recons up to block number
* @param {Number} limit 
*/
function getHdmdBlocksUpTo(blockNumber) {
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
            _id: { reconId: '$reconId', blockNumber: '$blockNumber' },
            blockNumber: { $max: '$blockNumber' }
         }
      },
      {
         $sort: { blockNumber: -1 }
      }
   ]);
}

getHdmdBlocksUpTo(10);
```