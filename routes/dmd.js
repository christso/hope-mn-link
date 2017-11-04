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

// Get all txns
router.get('/txns/all', function (req, res) {
    axios.get(dmdUrl).then(function (response) {
        let parsed = parseRawTxns(response.data.tx);
        res.json(parsed);
    }).catch(function (error) {
        res.json({ ERROR: error });
    });
});

// CREATE DMD transaction
router.post('/txn', function (req, res) {
    var newTxn = {
        txnHash: req.body.txnHash,
        blockNumber: req.body.blockNumber,
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
// blockNumber is Number
router.post('/txns/new', function (req, res) {
    // TODO: get last block stored in MongoDB
    var newParams = {
        blockNumber: req.body.blockNumber
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