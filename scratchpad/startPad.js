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

database.connect();

function seedHdmd() {
   return Promise.resolve(true);
}

function seedAll() {
   return seedHdmd()
      .then(() => downloadTxns())
      .catch(err => console.log(`Error downloading trasactions: ${err.stack}`))
      .then(() => getUnmatchedTxns())
      .then(([dmds, hdmds]) => reconcile(dmds, hdmds))
      .catch(err =>
         console.log(
            `Error retrieving unmatched transactions from MongoDB: ${err.stack}`
         )
      )
      .then(() => console.log('Seeding Successful'))
      .catch(err => console.log(`Error seeding: ${err.stack}`));
}

var syncPad = require('./syncPad');
var synchronizeAll = syncPad.synchronizeAll;
synchronizeAll()
   .then(() => (requireSeed = false))
   .catch(err => console.log(err.stack));

setInterval(() => true, 1000000);
