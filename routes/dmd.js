var config = require('../config');
var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');
var client = require('../client/dmdClient');
var hdmdClient = require('../client/hdmdClient');

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
router.post('/txns', function (req, res) {
    var newTxns = req.body;
    if (req.body.constructor != Array) {
        newTxns = [req.body];
    }
    newTxns = newTxns.map((txn) => {
        return {
            txnHash: txn.txnHash,
            blockNumber: txn.blockNumber,
            amount: txn.amount,
            balance: txn.balance
        };
    });

    // Create new DMD txn and save to DB
    DmdTxns.create(newTxns, function (err, newlyCreated) {
        if (err) {
            res.json({ 'Error': 'ERROR CREATING DMD TRANSACTION' });
        } else {
            res.json(newlyCreated);
        }
    });
});

// Post new DMD txns
// blockNumber is Number
router.post('/txns/sync', function (req, res) {
    // Get last block stored in MongoDB
    // then create txns that are after that block
    client.getLastSavedTxn(function(err, docs) {
        if (err) {
            res.json({ ERROR: err});
        } else {
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
        DmdTxns.create(newTxns, function (err, newlyCreated) {
            if (err) {
                res.json({ 'Error': 'ERROR CREATING DMD TRANSACTIONS' });
            } else {
                res.json(newlyCreated);
            }
        });

        // Invoke mint() where amount > 0
        

    }).catch(function (error) {
        res.json({ ERROR: error });
    });

    // TODO: invoke hdmd.mint() for each new DMD txn

    // TODO: link HDMD document with DMD document
});


module.exports = router;