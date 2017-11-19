var BigNumber = require('bignumber.js');
var config = require('../config');
var requireSeed = config.requireSeed;

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');

var dmdClient = require('../client/dmdClient');
var hdmdClient = require('../client/hdmdClient');
var reconClient = require('../client/reconClient');
var allowMinter = hdmdClient.allowMinter;
var defaultAccount = hdmdClient.defaultAccount;
var batchTransfer = hdmdClient.batchTransfer;
var downloadTxns = reconClient.downloadTxns;
var getUnmatchedTxns = reconClient.getUnmatchedTxns;
var reconcile = reconClient.reconcile;

var dmdInterval = require('../models/dmdInterval');
const contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;
const decimals = config.hdmdDecimals;

const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const queries = require('../client/databaseQueries');

// connect to database
let connection = database.createTestConnection();

queries.dmd
   .getNextBlockNumber(19000)
   .then(res => {
      console.log(res);
   })
   .catch(err => {
      console.log(err);
   });

setInterval(() => true, 1000000);
