// Blockchain Reconciliation

var express = require('express');
var router = express.Router();
var reconClient = require('../client/reconClient');
var synchronizeNext = reconClient.synchronizeNext;

router.post('/reconcile', function(req, res) {});

router.get('/hdmd/last', (req, res) => {
   reconClient
      .getLastHdmdRecon()
      .then(obj => res.json(obj))
      .catch(err => res.json(err));
});

router.get('/hdmd/balances', (req, res) => {
   reconClient
      .getBeginHdmdBalancesFromDmd()
      .then(obj => {
         res.json(obj);
      })
      .catch(err => res.json(err));
});

module.exports = router;
