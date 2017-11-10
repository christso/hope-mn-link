var config = require('../config');
var port = config.port;
var axios = require('axios').default;
var dmdTxns = require('../models/dmdTxn');
var mongoose = require('mongoose');
const dmdUrl = config.cryptoidDmdUri;
var hdmdClient = require('../client/hdmdClient');

/*----- Create DMD listener -----*/

// Call the API every hour. 
// Create MongoDB document for each new DMD transaction, which stores the txn hash.
// List Balance: http://chainz.cryptoid.info/dmd/api.dws?q=getbalance&a=dH4bKCoyNj9BzLuyU4JvhwvhYs7cnogDVb
// List Txns: https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js

// Parse CryptoID query which lists all txns
var client = {
    parseRawTxns(rawTxns) {
        let newTxns = rawTxns.map((rawTxn) => {
            return {
                txnHash: rawTxn[1],
                blockNumber: rawTxn[2],
                amount: rawTxn[4],
                balance: rawTxn[5]
            }
        });
        return newTxns;
    },
    saveTxns(newTxns, callback) {
        // Create new DMD txn and save to DB
        dmdTxns.create(newTxns, function (err, newlyCreated) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, newlyCreated);
            }
        });
    },
    getLastSavedTxn(callback) {
        // Find last saved txn in MongoDB
        // db.getCollection('dmdtxns').find().sort({blockNumber:-1}).limit(1)
        dmdTxns.find().sort({ blockNumber: -1 }).limit(1).exec(function (err, docs) {
            callback(err, docs);
        });
    },
    syncTxns(callback) {
        let getLastSavedTxn = client.getLastSavedTxn;
        let parseRawTxns = client.parseRawTxns;

        // Get last block stored in MongoDB
        // then create txns that are after that block
        getLastSavedTxn(function (err, docs) {
            if (err) {
                callback(err);
            } else {
                // format value
                let lastBlockNumber = 0;
                if (docs.length > 0) {
                    lastBlockNumber = docs[0].blockNumber;
                }
                createTxns(lastBlockNumber);
            }
        });
        // Create txns with block after lastBlockNumber
        let createTxns = (lastBlockNumber) => axios.get(dmdUrl).then(function (response) {
            // Parse CryptoID txns
            let parsedTxns = parseRawTxns(response.data.tx);
            let newTxns = parsedTxns.filter((txn) => {
                return txn.blockNumber > lastBlockNumber;
            });

            // Create new DMD txn in MongoDB
            dmdTxns.create(newTxns, function (err, newlyCreated) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, newlyCreated);
                }
            });

            // Invoke mint() where amount > 0
            newTxns.forEach(function (dmdTxn) {
                let amount = hdmdClient.getRawValue(dmdTxn.amount);
                if (amount > 0) {
                    hdmdClient.mint(amount, dmdTxn.txnHash, function (err, txnHash) {
                        if (err) {
                            console.log("ERROR MINTING", err);
                        }
                    });
                } else if (amount < 0) {
                    // Do nothing. Leave this as unmatched txn.
                }
            }, this);

        }).catch(function (error) {
            callback(error);
        });
    }    
};

let watchInterval = config.dmdWatchInterval

setInterval(function () {
    client.syncTxns(function(err, result) {
        if (err) {
            console.log('Error syncing with DMD CryptoID', err);
        } else if (!result) {
            console.log('Synced with DMD CryptoID - no changes');
        } else {
            console.log('Synced with DMD CryptoID', result);
        }
    });
}, watchInterval);



module.exports = client;