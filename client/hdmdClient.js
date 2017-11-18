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

const util = {
   /**
      * Distributes the minted amount to addresses in proportion to their balances
      * @param {<BigNumber>} amount - amount to distribute
      * @param {<BigNumber>[]} weights - array of weighting values to determine how much each recipient will receive
      * @return {<BigNumber>[]} return value of the smart contract function
      * */
   applyWeights: function(amount, weights) {
      let totalWeight = new BigNumber(0);
      weights.forEach(w => (totalWeight = totalWeight.add(w)));

      let newAmounts = [];
      weights.forEach(w => {
         newAmounts.push(w.mul(amount).div(totalWeight));
      });

      if (newAmounts.length === 0) return;

      let totalNewAmount = newAmounts.reduce((a, b) => a.add(b));
      let rounding = amount.sub(totalNewAmount);
      newAmounts[0] = newAmounts[0].add(rounding);

      return newAmounts;
   },

   /**
      * Converts the parsed value to the underlying uint value used by smart contract
      * @param {<BigNumber>} value - parsed value
      * @return {<BigNumber>} - original units
      * */
   getParsedNumber: function(value) {
      let divider = new BigNumber(10);
      divider = divider.pow(decimals);
      return value.div(divider);
   },

   /**
      * Converts to underlying uint value used by smart contract
      * @param {<BigNumber>} value - parsed value
      * @return {<BigNumber>} - original units
      */
   getRawNumber: function(value) {
      let multiplier = new BigNumber(10);
      multiplier = multiplier.pow(decimals);
      return value.mul(multiplier).round(0);
   }
};

const getParsedNumber = util.getParsedNumber;
const getRawNumber = util.getRawNumber;

checkVersion();

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

var ownerAddress;
getContractOwner()
   .then(address => (ownerAddress = address))
   .catch(err => console.log(`Error getting owner address: ${err}`));

function getContractOwner(callback) {
   if (callback) {
      hdmdContract.owner.call(callback);
      return;
   }
   return new Promise((resolve, reject) => {
      hdmdContract.owner.call((err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

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

      const assignBaseTxn = (target, event, decoded) => {
         target.txnHash = event.transactionHash;
         target.blockNumber = event.blockNumber;
         target.eventName = decoded.name;
      };

      let parsers = [];
      parsers['Mint'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         let amount = decoded.events[1].value;
         newTxn.amount = getParsedNumber(new BigNumber(amount ? amount : 0));
         newTxns.push(newTxn);
      };
      parsers['Unmint'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         let amount = decoded.events[1].value * -1;
         newTxn.amount = getParsedNumber(new BigNumber(amount ? amount : 0));
         newTxns.push(newTxn);
      };
      parsers['Burn'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = decoded.events[0].value;
         newTxn.dmdAddress = decoded.events[1].value;
         amount = decoded.events[2].value * -1;
         newTxn.amount = getParsedNumber(new BigNumber(amount ? amount : 0));
         newTxns.push(newTxn);
      };
      parsers['Transfer'] = (event, decoded) => {
         let amount = decoded.events[2].value;
         let fromAccount = decoded.events[0].value;
         let toAccount = decoded.events[1].value;

         let txnFrom = {};
         assignBaseTxn(txnFrom, event, decoded);
         txnFrom.account = fromAccount;
         txnFrom.amount = getParsedNumber(
            new BigNumber(amount ? amount : 0).mul(-1)
         );
         newTxns.push(txnFrom);

         let txnTo = {};
         assignBaseTxn(txnTo, event, decoded);
         txnTo.account = toAccount;
         txnTo.amount = getParsedNumber(new BigNumber(amount ? amount : 0));
         newTxns.push(txnTo);
      };

      for (var i = 0; i < eventLog.length; i++) {
         let event = eventLog[i];
         let decoded = decodedLog[i];
         let eventName = decoded.name;
         parsers[eventName](event, decoded);
      }

      resolve(newTxns);
   });
}

function getLastSavedTxn() {
   return hdmdTxns
      .find()
      .sort({ blockNumber: -1 })
      .limit(1)
      .exec();
}

function saveTxns(newTxns) {
   return hdmdTxns.create(newTxns);
}

/**
* Get mapping of accounts and their current balances from the HDMD blockchain
* @return {Promise} - promise returning mapping of accounts and balances
*/
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

/**
* Distributes the minted amount to addresses in proportion to their balances
* @param {<BigNumber>} amount - BigNumber amount to distribute
* @param {String[]} recipients - array of addresses that will receive the amount
* @param {<BigNumber[]>} weights - array of BigNumber weighting values to determine how much each recipient will receive
* @return {Promise} return value of the smart contract function
*/
function apportion(amount, recipients, weights) {
   let applyWeights = util.applyWeights;
   let newAmounts = applyWeights(amount, weights);
   return batchTransfer(recipients, newAmounts);
}

/**
* Transfer tokens from sender's address to a list of addresses
* @param {String[]} addresses - array of addresses to receive the tokens
* @param {Number[]} values - amounts to transfer
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

function canMint() {
   return new Promise((resolve, reject) => {
      hdmdContract.canMint(defaultAccount, (err, canMint) => {
         if (err) {
            reject(err);
         } else {
            resolve(canMint);
         }
      });
   });
}

function _mint(amount) {
   let rawAmount = getRawNumber(amount).toNumber();

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
* Mint amounts on HDMD smart contract
* @param {<BigNumber>} amount - amount in BigNumber
* @return {Promise} return value of the smart contract function
*/
function mint(amount) {
   return new Promise((resolve, reject) => {
      return _mint(amount).catch(err => {
         canMint().then(allowed => {
            if (!allowed) {
               let newErr = new Error(
                  `Address ${defaultAccount} is not allowed to mint`
               );
               reject(newErr);
               return;
            }
            reject(err);
         });
      });
   });
}

/**
* Unmints amounts on HDMD smart contract
* @param {<BigNumber>} amount - amount in BigNumber
* @return {Promise} return value of the smart contract function
*/
function unmint(amount) {
   let rawAmount = getRawNumber(amount).toNumber();
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
   getContractOwner: getContractOwner,
   apportion: apportion,
   applyWeights: util.applyWeights,
   allowMinter: allowMinter,
   defaultAccount: defaultAccount
};
