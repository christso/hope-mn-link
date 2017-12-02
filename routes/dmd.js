var config = require('../config');
var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');
var dmdClient = require('../client/dmdClient');
var hdmdClient = require('../client/hdmdClient');
var queries = require('../client/databaseQueries');

/*----  API for DMD ----*/
const dmdUrl = config.cryptoidDmdUri;

// Get all txns
router.get('/txns', function(req, res) {
   queries.dmd
      .getTransactions()
      .then(docs => {
         return res.json(docs);
      })
      .catch(err => {
         return res.json(err);
      });
});

// TODO: send DMDs to address
// router.post('/sendtoaddress', function(req, res) {});

// TODO: list dmds not matched to hdmds
// router.get('/txns/unmatched', function(req, res) {});

module.exports = router;
