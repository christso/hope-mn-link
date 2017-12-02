var config = require('../config');
var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');
var dmdClient = require('../client/dmdClient');
var hdmdClient = require('../client/hdmdClient');
var queries = require('../client/databaseQueries');
var typeConverter = require('../lib/typeConverter');

/*----  API for DMD ----*/
const dmdUrl = config.cryptoidDmdUri;

// Get all txns
router.get('/txns', function(req, res) {
   queries.dmd
      .getTransactions()
      .then(docs => {
         return res.json(
            docs.map(doc => {
               return {
                  txnHash: doc.txnHash,
                  blockNumber: doc.blockNumber,
                  amount: typeConverter.toBigNumber(doc.amount).toNumber()
               };
            })
         );
      })
      .catch(err => {
         return res.json(err);
      });
});

router.post('/intervals', function(req, res) {
   queries.dmd
      .createBlockIntervalsFromArray(req.body)
      .then(newlyCreated => {
         res.json(newlyCreated);
      })
      .catch(err => {
         res.json(err);
      });
});

router.get('/intervals', function(req, res) {
   queries.dmd
      .getBlockIntervals()
      .then(docs => {
         res.json(docs.map(doc => doc.blockNumber));
      })
      .catch(err => {
         res.json(err);
      });
});

// TODO: send DMDs to address
// router.post('/sendtoaddress', function(req, res) {});

// TODO: list dmds not matched to hdmds
// router.get('/txns/unmatched', function(req, res) {});

module.exports = router;
