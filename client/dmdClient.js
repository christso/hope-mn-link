var axios = require('axios').default;

/*----- TODO: Create DMD listener -----*/

// Call the API every hour. 
// Create MongoDB document for each new DMD transaction, which stores the txn hash.
// List Balance: http://chainz.cryptoid.info/dmd/api.dws?q=getbalance&a=dH4bKCoyNj9BzLuyU4JvhwvhYs7cnogDVb
// List Txns: https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js

var config = require('../config');
var port = config.port;

// Parse CryptoID query which lists all txns
var client = {
    parseRawTxns(rawTxns) {
        let newTxns = rawTxns.map((rawTxn) => {
            return {
                hash: rawTxn[1],
                block: rawTxn[2],
                amount: rawTxn[4],
                balance: rawTxn[5]
            }
        });
        return newTxns;
    }
};

//let watchInterval = 3600000; // 1 hour
let watchInterval = 5000; // 5 seconds

setInterval(function() {
    let mint = { hash: '0x999', amount: 100 }; // TODO: get value from DMD blockchain
    axios.post(`${config.apiUri}/api/hdmd/mint`, mint).then(function(response) {
        console.log("MINTED", response.data);
    }).catch(function(error) {
        console.log("ERROR MINTING", JSON.stringify(error));
    });
}, watchInterval);

module.exports = client;