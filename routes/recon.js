// Blockchain Reconciliation

var express = require('express');
var router = express.Router();
var reconClient = require('../client/reconClient');
var dmdIntervalClient = require('../client/dmdIntervalClient');
var synchronizeNext = reconClient.synchronizeNext;
var synchronizeAll = reconClient.synchronizeAll;
var Logger = require('../lib/logger');
var logger = new Logger();
var queries = require('../client/databaseQueries');
var typeConverter = require('../lib/typeConverter');
var config = require('../config');

router.get('/txns', function(req, res) {
   queries.recon
      .getTransactions()
      .then(docs => {
         return res.json(
            docs.map(doc => {
               return {
                  timestamp: doc.timestamp,
                  reconId: doc.reconId,
                  dmdTxnHash: doc.dmdTxnHash,
                  hdmdTxnHash: doc.hdmdTxnHash,
                  amount: typeConverter.toBigNumber(doc.amount).toNumber(),
                  account: doc.account,
                  blockNumber: doc.blockNumber,
                  eventName: doc.eventName,
                  dmdFlag: doc.dmdFlag,
                  hdmdFlag: doc.hdmdFlag
               };
            })
         );
      })
      .catch(err => {
         return res.json(err);
      });
});

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
         return res.json(err);
      });
});

router.post('/updatedmdintervals', function(req, res) {
   let tolerance = config.relativeBalanceChangeTolerance;
   dmdIntervalClient
      .updateBlockIntervals(tolerance)
      .then(newlyCreated => {
         return res.json(newlyCreated);
      })
      .catch(err => {
         return res.json(err);
      });
});

module.exports = router;
