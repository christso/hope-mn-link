var BigNumber = require('bignumber.js');
var config = require('../config');
var requireSeed = config.requireSeed;

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var dmdClient = require('./dmdClient');
var hdmdClient = require('./hdmdClient');
var reconClient = require('./reconClient');
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

// Initial contributions
function seedHdmd() {
   let accounts = contribs.accounts;
   let balances = contribs.balances.map(
      value => new BigNumber(Math.round(value, decimals))
   );
   let initialSupply = new BigNumber(contribs.initialSupply);

   return allowMinter(defaultAccount)
      .then(txnHash => console.log(`Allowed account ${defaultAccount} to mint`))
      .catch(err => console.log(`Error allowing minter ${defaultAccount}`))
      .then(() => batchTransfer(accounts, balances))
      .catch(err => {
         console.log(`Error seeding the smart contract: ${err.message}`);
      });
}

// Seed DB for DMD Block Intervals
const dmdBlockIntervals = require('../data/dbSeeds').dmdBlockIntervals;

function seedDmd() {
   return dmdInterval.create(dmdBlockIntervals);
}

function seedAll() {
   if (!requireSeed) {
      return Promise.resolve(true);
   }
   return seedDmd()
      .then(() => seedHdmd())
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

module.exports = {
   seedDmd: seedDmd,
   seedHdmd: seedHdmd,
   seedAll: seedAll
};
