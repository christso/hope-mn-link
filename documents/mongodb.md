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