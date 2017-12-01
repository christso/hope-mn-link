var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// execute contract app
var hdmdClient = require('../client/hdmdClient');

var hdmdContract = hdmdClient.hdmdContract;
var web3 = hdmdClient.web3;
var getBalances = hdmdClient.getBalances;

var contribs = require('../data/hdmdContributions');
var accounts = contribs.accounts;

/*----  API for HDMD ----*/

// Get address of wallets on connected eth node
router.get('/svr/accounts', function(req, res) {
   res.json(web3.eth.accounts);
});

// Get address of first wallet
router.get('/svr/coinbase', function(req, res) {
   res.json(web3.eth.coinbase);
});

// Get address of wallet used for invoking the contract
router.get('/svr/defaultaccount', function(req, res) {
   res.json(web3.eth.defaultAccount);
});

router.get('/owner', function(req, res) {
   // Return total supply. Should be 10000 if no tokens were minted or burned
   hdmdClient.getContractOwner().then(owner => res.json({ owner: owner }));
});

// Get all account balances of HDMD token holders
router.get('/balances', function(req, res) {
   getBalances()
      .then(balances => res.json(balances))
      .catch(err => res.json({ error: err }));
});

// Get all account balances of HDMD token holders
router.post('/balancesof', function(req, res) {
   hdmdClient
      .getBalancesOf(req.body)
      .then(balances => res.json(balances))
      .catch(err => {
         console.log(err);
         res.json({ error: err });
      });
});

// Get all account balances of HDMD token holders
router.get('/balances/all', function(req, res) {
   hdmdClient
      .getAllBalances()
      .then(balances => res.json(balances))
      .catch(err => {
         console.log(err);
         res.json({ error: err });
      });
});

// Get all account balances of HDMD token holders
router.get('/accounts', function(req, res) {
   hdmdClient
      .getBalancesSaved()
      .then(balances => res.json(balances))
      .catch(err => res.json({ error: err }));
});

// Get all account balances of HDMD token holders
router.get('/balances/saved', function(req, res) {
   hdmdClient
      .getBalancesSaved()
      .then(balances => res.json(balances))
      .catch(err => res.json({ error: err }));
});

// List accounts that hold HDMD
router.get('/accounts', function(req, res) {
   res.json(accounts);
});

router.post('/batchtransfer', function(req, res) {
   let addresses = req.body.addresses;
   let values = req.body.values;
   hdmdClient
      .batchTransfer(addresses, values)
      .then(tfrResult => res.json(tfrResult))
      .catch(err => res.json({ error: err }));
});

// CREATE HDMD transaction
router.post('/mint', function(req, res) {
   var mint = {
      txnHash: null,
      dmdTxnHash: req.body.dmdTxnHash,
      amount: req.body.amount
   };

   hdmdClient.mint(mint.amount, function(err, txnHash) {
      if (err) {
         res.json(err);
      } else {
         mint.txnHash = txnHash;
      }
   });
});

router.get('/totalsupply', function(req, res) {
   // Return total supply. Should be 10000 if no tokens were minted or burned
   res.send(hdmdContract.totalSupply.call());
});

router.get('/totalsupplysaved', function(req, res) {
   // Return total supply. Should be 10000 if no tokens were minted or burned
   hdmdClient
      .getTotalSupplySaved()
      .then(totalAmount => {
         res.json({ totalSupplySaved: totalAmount });
      })
      .catch(err => res.json({ error: err }));
});

module.exports = router;
