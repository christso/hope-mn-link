// Blockchain Reconciliation

var express = require('express');
var router = express.Router();
var reconClient = require('../client/reconClient');
var synchronizeNext = reconClient.synchronizeNext;
var synchronizeAll = reconClient.synchronizeAll;
var Logger = require('../lib/logger');
var logger = new Logger();

router.post('/syncnext', function(req, res) {
   reconClient
      .synchronizeNext(req.body.dmdBlockNumber)
      .then(obj => res.json(obj))
      .catch(err => res.json(err));
});

router.post('/syncall', function(req, res) {
   reconClient
      .synchronizeAll()
      .then(obj => {
         return res.json(obj);
      })
      .catch(err => {
         logger.error('Error synchronizing all: ' + err.stack);
         res.json(err);
      });
});

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
