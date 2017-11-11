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

    saveTxns(newTxns) {
        return new Promise((resolve, reject) => {
            // Create new DMD txn and save to DB
            return dmdTxns.create(newTxns);
        });
    },

    getLastSavedTxn() {
        // Find last saved txn in MongoDB
        // db.getCollection('dmdtxns').find().sort({blockNumber:-1}).limit(1)
        return dmdTxns.find().sort({ blockNumber: -1 }).limit(1).exec();
    },

    downloadTxns() {
        return new Promise((resolve, reject) => {
            let getLastSavedTxn = client.getLastSavedTxn;
            let parseRawTxns = client.parseRawTxns;

            // Get last block stored in MongoDB
            // then create txns that are after that block
            getLastSavedTxn().then(docs => {
                // format value
                let lastBlockNumber = 0;
                if (docs.length > 0) {
                    lastBlockNumber = docs[0].blockNumber;
                }
                createTxns(lastBlockNumber);
            }).catch(err => {
                reject(err);
            });

            // Create txns with block after lastBlockNumber
            let createTxns = (lastBlockNumber) => axios.get(dmdUrl).then(
                function (response) {
                    // Parse CryptoID txns
                    let parsedTxns = parseRawTxns(response.data.tx);
                    let newTxns = parsedTxns.filter((txn) => {
                        return txn.blockNumber > lastBlockNumber;
                    });

                    // Create new DMD txn in MongoDB
                    dmdTxns.create(newTxns)
                        .then(newlyCreated => resolve(newlyCreated))
                        .catch(err => reject(err));

                    // Invoke mint() where amount > 0
                    /*
                    newTxns.forEach(function (dmdTxn) {
                        let amount = hdmdClient.getRawValue(dmdTxn.amount);
                        if (amount > 0) {
                            hdmdClient.mint(amount, dmdTxn.txnHash).then(txnHash =>
                                Promise.resolve({context: 'Mint', txnHash: txnHash})
                            ).catch(err => Promise.reject({context: 'Mint', error: err}));
                        } else if (amount < 0) {
                            // TODO: unmint
                        }
                    }, this);
                    */
                }).catch(function (error) {
                    reject(error);
                });
        });
    }
};

module.exports = client;