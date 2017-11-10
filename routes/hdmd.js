var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// execute contract app
var hdmdClient = require('../client/hdmdClient');

var hdmdContract = hdmdClient.hdmdContract;
var web3 = hdmdClient.web3;
var getBalances = hdmdClient.getBalances;

var accounts = require('../data/hdmdAccounts');

/*----  API for HDMD ----*/

// Get address of wallets on connected eth node
router.get('/svr/accounts', function (req, res) {
    res.json(web3.eth.accounts);
});

// Get address of first wallet
router.get('/svr/coinbase', function (req, res) {
    res.json(web3.eth.coinbase);
});

// Get address of wallet used for invoking the contract
router.get('/svr/defaultaccount', function (req, res) {
    res.json(web3.eth.defaultAccount);
});

// Get all account balances of HDMD token holders
// TODO: This is blocking the entire node app. Need to use async.
router.get('/balances', function (req, res) {
    getBalances(function (err, balances) {
        if (err) {
            res.json({ error: err });
        } else {
            res.json(balances);
        }
    })
});

// List accounts that hold HDMD
router.get('/accounts', function (req, res) {
    res.json(accounts);
});

router.post('/batchtransfer', function (req, res) {
    // TODO: invoke batchTransfer()
    let addresses = req.body.addresses;
    let values = req.body.values;
    hdmdClient.batchTransfer(addresses, values, function (err, tfrResult) {
        if (err) {
            res.json({ error: err });
        } else {
            res.json(tfrResult);
        }
    });
});

// CREATE HDMD transaction
router.post('/mint', function (req, res) {
    var mint = {
        txnHash: null,
        dmdTxnHash: req.body.dmdTxnHash,
        amount: req.body.amount
    };

    hdmdClient.mint(mint.amount, mint.dmdTxnHash, function(err, txnHash) {
        if (err) {
            res.json(min);
        } else {
            mint.txnHash = txnHash;
        }
    });
});


router.get('/totalsupply', function (req, res) {
    // Return total supply. Should be 10000 if no tokens were minted or burned
    res.send(hdmdContract.totalSupply.call());
});

module.exports = router;