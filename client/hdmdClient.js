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

const wallet = require('../client/dmdWallet');

const contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;

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

let batchTransfer = (addresses, values) => {
   return hdmdContract.batchTransfer(addresses, values);
};

let reverseBatchTransfer = (addresses, values) => {
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
      parsers['Mint'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         newTxn.amount = toDbNumberDecimal(decoded.events[1].value);
         newTxns.push(newTxn);
      };
      parsers['Unmint'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = ownerAddress;
         newTxn.amount = toDbNumberDecimal(decoded.events[1].value * -1);
         newTxns.push(newTxn);
      };
      parsers['Burn'] = (event, decoded) => {
         let newTxn = {};
         assignBaseTxn(newTxn, event, decoded);
         newTxn.sender = decoded.events[0].value;
         newTxn.account = decoded.events[0].value;
         newTxn.dmdAddress = decoded.events[1].value;
         newTxn.amount = toDbNumberDecimal(decoded.events[2].value * -1);
         newTxns.push(newTxn);
      };
      parsers['Transfer'] = (event, decoded) => {
         let amount = decoded.events[2].value;
         let fromAccount = decoded.events[0].value;
         let toAccount = decoded.events[1].value;

         let txnFrom = {};
         assignBaseTxn(txnFrom, event, decoded);
         txnFrom.account = fromAccount;
         txnFrom.amount = toDbNumberDecimal(amount * -1);
         newTxns.push(txnFrom);

         let txnTo = {};
         assignBaseTxn(txnTo, event, decoded);
         txnTo.account = toAccount;
         txnTo.amount = toDbNumberDecimal(amount);
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
         contractObj.balanceOf(account, (err, value) => {
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
   let newAmounts = contractMath.applyWeights(amount.absoluteValue(), weights);
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
               blockNumber: -1,
               amount: typeConverter.numberDecimal(supply),
               txnHash: contractAddress,
               account: account,
               eventName: 'Adjustment'
            })
            .then(created => resolve(created))
            .catch(err => reject(err));
      });
   });
}

const unmatchedQueryDefs = {
   lookup: () => {
      return {
         $lookup: {
            from: 'recontxns',
            localField: 'txnHash',
            foreignField: 'hdmdTxnHash',
            as: 'recontxns'
         }
      };
   },
   match: () => {
      return {
         $match: {
            recontxns: {
               $eq: []
            }
         }
      };
   },
   group: () => {
      return {
         $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
         }
      };
   }
};

function getUnmatchedTxns(blockNumber) {
   let matchQueryDef = unmatchedQueryDefs.match();

   if (blockNumber) {
      matchQueryDef.$match.blockNumber = { $lte: blockNumber };
   }

   let lookupQueryDef = unmatchedQueryDefs.lookup();
   let groupQueryDef = unmatchedQueryDefs.group();

   let queryDef = [lookupQueryDef, matchQueryDef];

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
   batchTransfer: batchTransfer,
   reverseBatchTransfer: reverseBatchTransfer,
   mint: mint,
   unmint: unmint,
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
   allowThisMinter: allowThisMinter
};
