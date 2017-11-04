var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');

/*----  API for DMD ----*/
const dmdUrl = 'https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js';

// CREATE DMD transaction
router.post('/:hash', function(req, res) {
    DmdTxns.create(req.body, function(err, newDmdTxn) {
        if (err) {
            res.json({ 'Error': 'ERROR CREATING DMD TRANSACTION'});
        } else {
            res.json(newDmdTxn);
        }
    });
});

// Parse CryptoID query which lists all txns
function parseRawTxns(rawTxns) {
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

// Get all txns
router.get('/txns/all', function(req, res) {
    axios.get(dmdUrl).then(function(response){
        let parsed = parseRawTxns(response.data.tx);
        res.json(parsed);
    }).catch(function(error) {
        res.json({ ERROR: error});
    });
});

// Get the last txn
router.get('/txns/last', function(req, res) {
    axios.get(dmdUrl).then(function(response){
        let txns = response.data.tx;
        let length = txns.length;
        let rawTxn = response.data.tx[length-1];
        let txn = {
            hash: rawTxn[1],
            block: rawTxn[2],
            amount: rawTxn[4],
            balance: rawTxn[5]
        };
        res.json(txn);
    }).catch(function(error){
        res.json({ ERROR: `ERROR READING ${dmdUrl}`});
    });
});

module.exports = router;