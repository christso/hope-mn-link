const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
const hdmdTxns = require('../models/hdmdTxn');
const burnTxns = require('../models/burn');
const mintTxns = require('../models/mint');

const wallet = require('../client/dmdWallet');

const contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;

const abiDecoder = require('abi-decoder');

abiDecoder.addABI(abi);

var requireSeed = config.requireSeed;

const hdmdVersion = config.hdmdVersion;
const ethNodeAddress = config.ethNodeAddress;

var contractAddress = config.hdmdContractAddress;
var gasLimit = config.ethGasLimit;
var decimals = config.hdmdDecimals;

// set the Web3 to where we need to connect
var web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));

// set default account to use as msg.sender to contract
// this account will need to be added via allowMinter to be able to invoke mint()
web3.eth.defaultAccount = web3.eth.coinbase;
var defaultAccount = web3.eth.defaultAccount;

// Set up a contract with interface
var contract = web3.eth.contract(abi);
// Instantiate contact so we can interact
var hdmdContract = contract.at(contractAddress);

function checkVersion() {
   // Check that version of app matches deployed contract
   var hdmdVersionDeployed = hdmdContract.version.call();
   if (hdmdVersionDeployed == hdmdVersion) {
      console.log('HDMD contract matched.');
   } else {
      console.log(
         `ERROR: HDMD contract version deployed is ${hdmdVersionDeployed} but app version is ${hdmdVersion}`
      );
   }
}
checkVersion();

function allowMinter(account, callback) {
   if (callback) {
      hdmdContract.allowMinter(account, callback);
      return;
   }
   return new Promise((resolve, reject) => {
      hdmdContract.allowMinter(account, (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

function seedData() {
   if (!requireSeed) return Promise.resolve();
   let accounts = contribs.accounts;
   let balances = contribs.balances.map(value => new BigNumber(value));

   return allowMinter(defaultAccount)
      .then(txnHash => console.log(`Allowed account ${defaultAccount} to mint`))
      .catch(err => console.log(`Error allowing minter ${defaultAccount}`))
      .then(() => batchTransfer(accounts, balances))
      .catch(err => {
         console.log(`Error seeding the smart contract: ${err.message}`);
      })
      .then(() => (requireSeed = false));
}

function downloadTxns() {
   return getLastSavedTxn()
      .then(docs => {
         // get last block number that was saved in MongoDB
         let lastSavedBlockNumber = 0;
         if (docs.length > 0) {
            lastSavedBlockNumber = docs[0].blockNumber;
         }
         return lastSavedBlockNumber;
      })
      .then(lastSavedBlockNumber =>
         // get event logs after the last block number that we saved
         filterEventsGet(lastSavedBlockNumber)
            .then(eventLog =>
               // parse the event log
               parseEventLog(eventLog)
            )
            .then(newTxns =>
               // save the newTxns into MongoDB
               saveTxns(newTxns)
            )
            .catch(error =>
               console.log('--- Error downloading DMD Txn Log ---', error)
            )
      );
}

var filter;
function filterEventsGet(fromBlock) {
   return new Promise((resolve, reject) => {
      // fromBlock needs to be greater than the last saved block
      filter = web3.eth.filter({
         fromBlock: fromBlock + 1,
         toBlock: 'latest',
         address: contractAddress
      });
      filter.get(function(error, result) {
         if (error) {
            reject(error);
         } else {
            resolve(result);
         }
      });
   });
}

function parseEventLog(eventLog) {
   return new Promise((resolve, reject) => {
      let decodedLog = abiDecoder.decodeLogs(eventLog);
      let newTxns = [];
      newTxns.length = eventLog.length;
      for (var i = 0; i < eventLog.length; i++) {
         let event = eventLog[i];
         let decoded = decodedLog[i];
         let eventName = decoded.name;
         let newTxn = {
            txnHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventName: eventName
         };
         let amount;
         if (eventName === 'Mint') {
            newTxn.sender = decoded.events[0].value;
            amount = decoded.events[1].value;
         } else if (eventName === 'Unmint') {
            newTxn.sender = decoded.events[0].value;
            amount = decoded.events[1].value * -1;
         } else if (eventName === 'Burn') {
            newTxn.sender = decoded.events[0].value;
            newTxn.dmdAddress = decoded.events[1].value;
            amount = decoded.events[2].value * -1;
         } else if (eventName === 'Transfer') {
            // TODO: add logic here
         }
         newTxn.amount = getParsedNumber(new BigNumber(amount ? amount : 0));
         newTxns[i] = newTxn;
         console.log('Parsed HDMD Txn', newTxn);
      }
      resolve(newTxns);
   });
}

function getLastSavedTxn() {
   // TODO: instead of hardcoding number, get the last block from MongoDB
   return hdmdTxns
      .find()
      .sort({ blockNumber: -1 })
      .limit(1)
      .exec();
}

function saveTxns(newTxns) {
   return hdmdTxns.create(newTxns);
}

function getBalances() {
   return new Promise((resolve, reject) => {
      let accounts_processed = 0;
      let totalAccounts = accounts.length;
      let values = [];

      let appendBalance = (err, value) => {
         if (err || !value.c) {
            values.push(0);
         } else {
            values.push(value.c[0]);
         }
         accounts_processed = accounts_processed + 1;
      };

      let balances = [];
      let createMapping = accounts => {
         for (var i = 0; i < accounts.length; i++) {
            balances.push({ address: accounts[i], value: values[i] });
         }
         resolve(balances);
         return;
      };

      accounts.forEach(account => {
         hdmdContract.balanceOf(account, (err, value) => {
            let done = () => accounts_processed === totalAccounts;
            appendBalance(err, value);
            if (done()) {
               createMapping(accounts);
            }
         });
      });
   });
}

function getTotalSupplySaved() {
   return new Promise((resolve, reject) => {
      hdmdTxns
         .aggregate([
            {
               $group: {
                  _id: null,
                  totalAmount: { $sum: '$amount' }
               }
            }
         ])
         .then(res => resolve(res[0].totalAmount))
         .catch(err => reject(err));
   });
}

// Used to distribute the minted amount to addresses in proportion to their balances
// fundingAddress should be the account that did the minting = web3.eth.defaultAccount
function apportion(amount, fundingAddress) {
   return new Promise((resolve, reject) => {
      getBalances()
         .then(balances => {
            let addresses = balances.map(el => {
               return el.address;
            });
            let oldAmounts = balances.map(el => {
               return el.value;
            });
            let oldTotal = oldAmounts.reduce((a, b) => a + b, 0);

            // subtract value so we get balance before minting
            balances[fundingAddress] -= amount;

            let addValues = oldAmounts.map(oldValue => {
               return Math.floor(oldValue * amount / oldTotal);
            });

            // console.log('calling batchTransfer');
            // console.log('addresses', JSON.stringify(addresses));
            // console.log('values', JSON.stringify(addValues));
            resolve(batchTransfer(addresses, addValues));
         })
         .catch(err => reject(err));
   });
}

/**
* Transfer tokens from sender's address to a list of addresses
* @param {string[]} addresses - array of addresses to receive the tokens
* @param {number[]} values - amounts to transfer
* @return {Promise} return value of the smart contract function
*/
function batchTransfer(addresses, values) {
   return new Promise((resolve, reject) => {
      let rawValues = values.map(value => getRawNumber(value).toNumber());
      hdmdContract.batchTransfer(
         addresses,
         rawValues,
         { gas: gasLimit },
         (error, result) => {
            if (error) {
               reject(error);
            } else {
               resolve(result);
            }
         }
      );
   });
}

/**
* Converts the parsed value to the underlying uint value used by smart contract
* @param {BigNumber} value - parsed value
* @return {BigNumber} - original units
*/
function getParsedNumber(value) {
   let divider = new BigNumber(10);
   divider = divider.pow(decimals);
   return value.div(divider);
}

/**
* Converts to underlying uint value used by smart contract
* @param {BigNumber} value - parsed value
* @return {BigNumber} - original units
*/
function getRawNumber(value) {
   let multiplier = new BigNumber(10);
   multiplier = multiplier.pow(decimals);
   return value.mul(multiplier);
}

/**
* Mint amounts on HDMD smart contract
* @param {BigNumber} amount - amount in BigNumber
* @param {requestCallback} callback - The callback that handles the response.
* @return {Promise} return value of the smart contract function
*/
function mint(amount, callback) {
   let rawAmount = getRawNumber(amount).toNumber();
   if (callback) {
      hdmdContract.mint(rawAmount, callback);
      return;
   }
   return new Promise((resolve, reject) => {
      hdmdContract.mint(rawAmount, (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

/**
* Unmints amounts on HDMD smart contract
* @param {BigNumber} amount - amount in BigNumber
* @param {requestCallback} callback - The callback that handles the response.
* @return {Promise} return value of the smart contract function
*/
function unmint(amount, callback) {
   let rawAmount = getRawNumber(amount).toNumber();
   if (callback) {
      hdmdContract.unmint(rawAmount, callback);
      return;
   }
   return new Promise((resolve, reject) => {
      hdmdContract.unmint(rawAmount, (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

var unmatchedTxnsQueryDef = [
   {
      $lookup: {
         from: 'recontxns',
         localField: 'txnHash',
         foreignField: 'hdmdTxnHash',
         as: 'recontxns'
      }
   },
   {
      $match: {
         recontxns: { $eq: [] }
      }
   }
];

var groupQuery = {
   $group: {
      _id: null,
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
   }
};

function getUnmatchedTxnsTotal() {
   let queryDef = unmatchedTxnsQueryDef;
   queryDef.push(groupQuery);
   return hdmdTxns.aggregate(queryDef);
}

function getUnmatchedTxns() {
   let queryDef = unmatchedTxnsQueryDef;
   return hdmdTxns.aggregate(queryDef);
}

module.exports = {
   web3: web3,
   hdmdContract: hdmdContract,
   getBalances: getBalances,
   batchTransfer: batchTransfer,
   mint: mint,
   unmint: unmint,
   downloadTxns: downloadTxns,
   getTotalSupplySaved: getTotalSupplySaved,
   getUnmatchedTxns: getUnmatchedTxns,
   seedData: seedData
};
