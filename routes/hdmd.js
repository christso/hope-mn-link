var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// execute contract app
var hdmdClient = require('../client/hdmdClient');
var queries = require('../client/databaseQueries');

var hdmdContract = hdmdClient.hdmdContract;
var web3 = hdmdClient.web3;
var getBalances = hdmdClient.getBalances;
var typeConverter = require('../lib/typeConverter');

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

router.get('/txns', function(req, res) {
   queries.hdmd
      .getTransactions()
      .then(docs => {
         return res.json(
            docs.map(doc => {
               return {
                  txnHash: doc.txnHash,
                  blockNumber: doc.blockNumber,
                  amount: typeConverter.toBigNumber(doc.amount).toNumber(),
                  account: doc.account,
                  eventName: doc.eventName,
                  sender: doc.sender
               };
            })
         );
      })
      .catch(err => {
         return res.json(err);
      });
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

// Get all account balances of HDMD token holders, both actual and saved
router.get('/balances/all', function(req, res) {
   hdmdClient
      .getAllBalances()
      .then(balances => res.json(balances))
      .catch(err => {
         console.log(err);
         res.json({ error: err });
      });
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
      .catch(err => res.json(err));
});

// CREATE HDMD transaction
router.post('/mint', function(req, res) {
   var amount = req.body.amount;

   hdmdClient.mint(amount, function(err, txnHash) {
      if (err) {
         res.json(err);
      } else {
         mint.txnHash = txnHash;
         res.json({ txnHash: txnHash });
      }
   });
});

router.get('/totalsupply', function(req, res) {
   // Return total supply. Should be 10000 if no tokens were minted or burned
   hdmdClient.getTotalSupply().then(totalSupply => {
      res.json({ totalSupply: totalSupply });
   });
});

router.get('/totalsupply/saved', function(req, res) {
   // Return total supply. Should be 10000 if no tokens were minted or burned
   hdmdClient
      .getTotalSupplySaved()
      .then(totalAmount => {
         res.json({ totalSupply: totalAmount });
      })
      .catch(err => res.json(err));
});

module.exports = router;
