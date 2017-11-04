var config = require('../config');
var port = config.port;
var axios = require('axios').default;
var DmdTxns = require('../models/dmdTxn');

/*----- TODO: Create DMD listener -----*/

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
        DmdTxns.create(newTxns, function (err, newlyCreated) {
            if (err) {
                callback({ 'Error': 'ERROR CREATING DMD TRANSACTIONS' });
            } else {
                callback(newlyCreated);
            }
        });
    },
    lastSavedTxn(callback) {
        // TODO: find last saved txn in MongoDB
        // db.getCollection('dmdtxns').find().sort({blockNumber:-1}).limit(1)
        // define index on blockNumber in MongoDB
        DmdTxns.find().sort({ blockNumber: -1 }).limit(1).exec(function (err, docs) {
            callback(err, docs);
        });
    }
};


//let watchInterval = 3600000; // 1 hour
let watchInterval = 5000; // 5 seconds

setInterval(function () {
    // TODO: get laste MongoDB dmdTxn


    let mint = { txnHash: '0x999', amount: 100 }; // TODO: get value from DMD blockchain when DMD wallet receives staking reward

    // TODO: update MongoDB dmdTxn

    axios.post(`${config.apiUri}/api/hdmd/mint`, mint).then(function (response) {
        console.log("MINTED", response.data);
    }).catch(function (error) {
        console.log("ERROR MINTING", JSON.stringify(error));
    });
}, watchInterval);

module.exports = client;