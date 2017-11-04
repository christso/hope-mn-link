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

// TODO: get address of web3 wallet
// what address is web3 using to invoke the contract?
// we need to add this account via allowMinter
router.get('/svr/accounts', function (req, res) {
    res.json(web3.eth.accounts);
});

router.get('/svr/coinbase', function (req, res) {
    res.json(web3.eth.coinbase);
});

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

// CREATE DMD transaction
router.post('/mint', function(req, res) {
    var mint = {
        hash: req.body.hash,
        amount: req.body.amount
    };

    let txnStatus = hdmdContract.mint(mint.amount);

    res.json(mint);

    // TODO: create mongo document for each mint
    
    // TODO: link HDMD document with DMD document
});


router.get('/totalsupply', function (req, res) {
    // Return total supply. Should be 10000 if no tokens were minted or burned
    res.send(hdmdContract.totalSupply.call());
});

module.exports = router;