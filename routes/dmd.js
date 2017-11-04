var config = require('../config');
var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');
var client = require('../client/dmdClient');
var parseRawTxns = client.parseRawTxns;

var DmdTxns = require('../models/dmdTxn');

/*----  API for DMD ----*/
const dmdUrl = config.cryptoidDmdUri;

// CREATE DMD transaction
router.post('/txn', function(req, res) {
    var newTxn = {
        hash: req.body.hash,
        block: req.body.block,
        amount: req.body.amount,
        balance: req.body.balance
    };
    
    // var newTxn =     {
    //     hash: "15AF02476D9382FA7C70A5904B76294BFF3B0F4D134D5807C5A227AB5B2F6F2A",
    //     block: 18759,
    //     amount: 1.5275,
    //     balance: 10003.055
    // };

    // Create new DMD txn and save to DB
    DmdTxns.create(newTxn, function(err, newlyCreated) {
        if (err) {
            res.json({ 'Error': 'ERROR CREATING DMD TRANSACTION'});
        } else {
            res.json(newlyCreated);
        }
    });
});

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