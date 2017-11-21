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

const sinon = require('sinon');
const hdmdContract = require('../client/hdmdContract');

// connect to database
let connection = database.createTestConnection();

var data = [640.871654887, 3670.68499516765, 6000.344823265084];
console.log(data.reduce((a, b) => a + b));

setInterval(() => true, 1000000);
