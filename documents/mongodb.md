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

Get DMDs in reconTxns and the most latest associated HDMD
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
            $let: {
               vars: {
                  obj: {
                     $arrayElemAt: [
                        {
                           $filter: {
                              input: '$recons',
                              as: 'recon',
                              cond: {
                                 $and: [
                                    { $ne: ['$$recon.hdmdTxnHash', null] },
                                    { $ne: ['$$recon.hdmdTxnHash', ''] },
                                    { $eq: ['$$recon.blockNumber', { $max: '$$recon.blockNumber' }] } 
                                 ]
                              }
                           }
                        },
                        0
                     ]
                  }
               },
               in: { blockNumber: '$$obj.blockNumber' }
            }
         }
      }
   }
])
```