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
router.post('/txn', function (req, res) {
    var newTxn = {
        hash: req.body.hash,
        block: req.body.block,
        amount: req.body.amount,
        balance: req.body.balance
    };

    // Create new DMD txn and save to DB
    DmdTxns.create(newTxn, function (err, newlyCreated) {
        if (err) {
            res.json({ 'Error': 'ERROR CREATING DMD TRANSACTION' });
        } else {
            res.json(newlyCreated);
        }
    });
});

// Post new DMD txns


// Get all txns
router.get('/txns/all', function (req, res) {
    axios.get(dmdUrl).then(function (response) {
        let parsed = parseRawTxns(response.data.tx);
        res.json(parsed);
    }).catch(function (error) {
        res.json({ ERROR: error });
    });
});

// Get the last txn
router.get('/txns/last', function (req, res) {
    axios.get(dmdUrl).then(function (response) {
        let txns = response.data.tx;
        let length = txns.length;
        let rawTxn = response.data.tx[length - 1];
        // TODO: we can reuse parseRawTxns
        let txn = {
            hash: rawTxn[1],
            block: rawTxn[2],
            amount: rawTxn[4],
            balance: rawTxn[5]
        };
        res.json(txn);
    }).catch(function (error) {
        res.json({ ERROR: `ERROR READING ${dmdUrl}` });
    });
});

// block is Number
router.post('/txns/new', function (req, res) {
    // TODO: get last block stored in MongoDB
    var newParams = {
        block: req.body.block
    };

    // TODO: do not save DMD txns that are already in DB
    axios.get(dmdUrl).then(function (response) {
        let newTxns = parseRawTxns(response.data.tx);

        // Create new DMD txn and save to DB
        DmdTxns.create(newTxns, function (err, newlyCreated) {
            if (err) {
                res.json({ 'Error': 'ERROR CREATING DMD TRANSACTIONS' });
            } else {
                res.json(newlyCreated);
            }
        });
    }).catch(function (error) {
        res.json({ ERROR: error });
    });

    // TODO: invoke hdmd.mint() for each new DMD txn

    // TODO: link HDMD document with DMD document
});


module.exports = router;