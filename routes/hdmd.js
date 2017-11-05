var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// execute contract app
var hdmdClientImp = require('../client/hdmdClient');
var hdmdClient = new hdmdClientImp();
var hdmdContract = hdmdClient.hdmdContract;
var web3 = hdmdClient.web3;

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
// TODO: Make this run faster. We should cache results.
router.get('/balances', function (req, res) {

    let balances = accounts.map((account) => {
        let balance = hdmdContract.balanceOf(account);
        return { address: account, value: balance }
    });
    res.json(balances);
});

// List accounts that hold HDMD
router.get('/accounts', function (req, res) {
    res.json(accounts);
});

router.get('/batchtransfer', function (req, res) {
    // TODO: invoke batchTransfer()

});

// CREATE HDMD transaction
router.post('/mint', function(req, res) {
    var mint = {
        txnHash: null,
        dmdTxnHash: req.body.txnHash,
        amount: req.body.amount
    };

    mint.txnHash = hdmdContract.mint(mint.amount, mint.txnHash);
    res.json(mint);

    // TODO: create mongo document for each mint
    
    // TODO: link HDMD document with DMD document
});


router.get('/totalsupply', function (req, res) {
    // Return total supply. Should be 10000 if no tokens were minted or burned
    res.send(hdmdContract.totalSupply.call());
});

module.exports = router;