/**
 * @typedef {<BigNumber>} BigNumber
 */

const BigNumber = require('bignumber.js');
const typeConverter = require('../lib/typeConverter');
var numberDecimal = typeConverter.numberDecimal;
var toBigNumber = typeConverter.toBigNumber;

const config = require('../config');
const hdmdTxns = require('../models/hdmdTxn');
var hdmdContract = require('./hdmdContract');
var Logger = require('../lib/logger');
var logger = new Logger('hdmdClient');
var queries = require('../client/databaseQueries');

const wallet = require('../client/dmdWallet');

const contribs = require('../data/hdmdContributions');
const contribAccounts = contribs.accounts;

var eventNames = {
   burn: 'Burn',
   mint: 'Mint',
   unmint: 'Unmint',
   transfer: 'Transfer'
};

var contractAddress = config.hdmdContractAddress;
var gasLimit = config.ethGasLimit;
var decimals = config.hdmdDecimals;

var web3 = hdmdContract.web3;
var abiDecoder = hdmdContract.abiDecoder;

// set default account to use as msg.sender to contract
// this account will need to be added via allowMinter to be able to invoke mint()
web3.eth.defaultAccount = web3.eth.coinbase;
var defaultAccount = web3.eth.defaultAccount;

// contractObj
var contractObj = hdmdContract.contractObj;
var getContractOwner = () => {
   return hdmdContract.getContractOwner();
};
var ownerAddress;
var allowMinter = account => {
   return hdmdContract.allowMinter(account);
};
var getTotalSupply = () => {
   return hdmdContract.getTotalSupply();
};
var mint = amount => {
   return hdmdContract.mint(amount);
};
var unmint = amount => {
   return hdmdContract.unmint(amount);
};
var burn = (amount, sendToAddress) => {
   return hdmdContract.burn(amount, sendToAddress);
};

var batchTransfer = (addresses, values) => {
   return hdmdContract.batchTransfer(addresses, values);
};

var reverseBatchTransfer = (addresses, values) => {
   return hdmdContract.reverseBatchTransfer(addresses, values);
};

// contract math
const contractMath = require('../lib/contractMath');
contractMath.decimals = decimals;
let getParsedNumber = contractMath.getParsedNumber;
let getRawNumber = contractMath.getRawNumber;

function init(newHdmdContract) {
   let assign = () => {
      return new Promise(resolve => {
         if (newHdmdContract) {
            hdmdContract = newHdmdContract;
         }
         resolve();
      });
   };

   return assign().then(() => {
      getContractOwner()
         .then(address => (ownerAddress = address))
         .catch(err => {
            throw new Error(`Error getting owner address: ${err.stack}`);
         });
   });
}

init();

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

      let toDbNumberDecimal = amount => {
         return numberDecimal(
            getParsedNumber(new BigNumber(amount ? amount : 0))
         );
      };

      const assignBaseTxn = (target, event, decoded) => {
         target.txnHash = event.transactionHash;
         target.blockNumber = event.blockNumber;
         target.eventName = decoded.name;
      };

      let parsers = [];
      parsers[eventNames.mint] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         newTxn.amount = toDbNumberDecimal(decoded.events[1].value);
         newTxns.push(newTxn);
      };
      parsers[eventNames.unmint] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         newTxn.amount = toDbNumberDecimal(decoded.events[1].value * -1);
         newTxns.push(newTxn);
      };
      parsers[eventNames.burn] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = decoded.events[0].value;
         newTxn.dmdAddress = decoded.events[1].value;
         newTxn.amount = toDbNumberDecimal(decoded.events[2].value * -1);
         newTxns.push(newTxn);
      };
      parsers[eventNames.transfer] = (event, decoded) => {
         let amount = decoded.events[2].value;
         let fromAccount = decoded.events[0].value;
         let toAccount = decoded.events[1].value;

         let txnFrom = {};
         assignBaseTxn(txnFrom, event, decoded);
         txnFrom.account = fromAccount;
         txnFrom.amount = toDbNumberDecimal(amount * -1);
         txnFrom.sender = null;
         newTxns.push(txnFrom);

         let txnTo = {};
         assignBaseTxn(txnTo, event, decoded);
         txnTo.account = toAccount;
         txnTo.amount = toDbNumberDecimal(amount);
         txnTo.sender = null;
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
      let totalAccounts = contribAccounts.length;
      let values = [];

      let appendBalance = value => {
         if (!value.c) {
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

      contribAccounts.forEach(account => {
         hdmdContract.balanceOf(account).then(value => {
            appendBalance(value);
            if (accounts_processed === totalAccounts) {
               createMapping(contribAccounts);
            }
         });
      });
   });
}

function getBalancesOf(accounts) {
   let promises = [];
   accounts.forEach(account => {
      let p = hdmdContract.balanceOf(account);
      promises.push(p);
   });
   return Promise.all(promises).then(balances => {
      let mapped = [];
      for (let i = 0; i < accounts.length; i++) {
         let bal = balances[i] ? balances[i] : 0;
         mapped.push({
            account: accounts[i],
            balance: contractMath.getParsedNumber(new BigNumber(bal)).toNumber()
         });
      }
      return mapped;
   });
}

function getAllBalances() {
   let savedBals = [];
   let realBals = [];
   let mappedBals = [];
   return getBalancesSaved()
      .then(bals => {
         savedBals = bals;
         let accounts = bals.map(bal => {
            return bal.account;
         });
         return getBalancesOf(accounts);
      })
      .then(bals => {
         realBals = bals;
         for (let i = 0; i < realBals.length; i++) {
            let realBal = realBals[i];
            let savedBal = savedBals.filter(bal => {
               return bal.account === realBal.account;
            })[0];
            mappedBals.push({
               account: realBal.account,
               balance: realBal.balance,
               savedBalance: savedBal.balance
            });
         }
         return mappedBals;
      });
}

function getBalancesSaved() {
   return queries.hdmd.getBalances().then(bals => {
      return bals.map(bal => {
         return {
            account: bal.account,
            balance: typeConverter.toBigNumber(bal.balance).toNumber()
         };
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
   logger.debug(`[HDMD] Apportioning ${amount.toNumber()} HDMDs`);
   let newAmounts = contractMath.applyWeights(
      amount.absoluteValue(),
      weights,
      decimals
   );

   logger.debug(``);
   if (amount.greaterThan(0)) {
      return batchTransfer(recipients, newAmounts);
   } else {
      return reverseBatchTransfer(recipients, newAmounts);
   }
}

/**
 * @returns {Promise.<BigNumber>}
 */
function getTotalSupplyNotSaved() {
   // return hdmdClient.totalSupply - hdmdTxns.aggregate({group: { $sum: 'amount'}})
   let pSavedTotal = hdmdTxns.aggregate([
      {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
         }
      }
   ]);

   let actualTotal = 0;
   let savedTotal = 0;

   return hdmdContract
      .getTotalSupply()
      .then(total => {
         actualTotal = total;
         return actualTotal;
      })
      .then(() => {
         return pSavedTotal.then(doc => {
            savedTotal = doc[0]
               ? toBigNumber(doc[0].totalAmount)
               : toBigNumber(0);
            // logger.log(toBigNumber(savedTotal).toNumber());
            return savedTotal;
         });
      })
      .then(() => {
         let diff = actualTotal.minus(savedTotal);
         return diff;
      });
}

/**
 * @returns {Promise.<HdmdTxn>}
 */
function saveTotalSupplyDiff(account) {
   return new Promise((resolve, reject) => {
      if (!config.saveInitialSupply) {
         return;
      }
      if (account === undefined) {
         account = ownerAddress;
      }
      getTotalSupplyNotSaved().then(supply => {
         return hdmdTxns
            .create({
               txnHash: contractAddress,
               blockNumber: -1,
               amount: typeConverter.numberDecimal(supply),
               account: account,
               eventName: 'Adjustment',
               sender: null
            })
            .then(created => resolve(created))
            .catch(err => reject(err));
      });
   });
}

/**
 * Get unmatched HDMD txns excluding burns that are pending
 * @param {Number} blockNumber
 */
function getUnmatchedTxns(blockNumber) {
   let reconMatchQueryDef = {
      $match: {
         recontxns: {
            $eq: []
         }
      }
   };

   let reconLookupQueryDef = {
      $lookup: {
         from: 'recontxns',
         localField: 'txnHash',
         foreignField: 'hdmdTxnHash',
         as: 'recontxns'
      }
   };

   let burnLookupQueryDef = {
      $lookup: {
         from: 'burns',
         localField: 'txnHash',
         foreignField: 'hdmdTxnHash',
         as: 'burns'
      }
   };

   let burnMatchQueryDef = {
      $match: {
         burns: {
            $eq: []
         }
      }
   };

   if (blockNumber) {
      reconMatchQueryDef.$match.blockNumber = { $lte: blockNumber };
   }

   let queryDef = [
      reconLookupQueryDef,
      reconMatchQueryDef,
      burnLookupQueryDef,
      burnMatchQueryDef
   ];

   return hdmdTxns.aggregate(queryDef);
}

function allowThisMinter() {
   if (!config.allowThisMinter) {
      return Promise.resolve();
   }

   return hdmdContract.canMint(defaultAccount).then(canMint => {
      if (canMint) {
         logger.log(`Account ${defaultAccount} is already allowed to mint`);
         return true;
      }
      return allowMinter(defaultAccount)
         .then(txnHash => {
            logger.log(`Allowed account ${defaultAccount} to mint`);
            return txnHash;
         })
         .catch(err => {
            logger.log(`Error allowing minter ${defaultAccount}`);
            return Promise.reject(err);
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
               logger.log('--- Error downloading HDMD Txn Log ---', error)
            )
      );
}

module.exports = {
   init: init,
   web3: web3,
   hdmdContract: hdmdContract,
   getBalances: getBalances,
   getBalancesSaved: getBalancesSaved,
   getBalancesOf: getBalancesOf,
   batchTransfer: batchTransfer,
   reverseBatchTransfer: reverseBatchTransfer,
   mint: mint,
   unmint: unmint,
   burn: burn,
   downloadTxns: downloadTxns,
   getTotalSupply: getTotalSupply,
   getTotalSupplySaved: getTotalSupplySaved,
   getTotalSupplyNotSaved: getTotalSupplyNotSaved,
   getUnmatchedTxns: getUnmatchedTxns,
   getContractOwner: getContractOwner,
   apportion: apportion,
   applyWeights: contractMath.applyWeights,
   allowMinter: allowMinter,
   defaultAccount: defaultAccount,
   saveTotalSupplyDiff: saveTotalSupplyDiff,
   allowThisMinter: allowThisMinter,
   getAllBalances: getAllBalances,
   eventNames: eventNames
};
