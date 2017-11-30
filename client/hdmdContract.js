const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
var Logger = require('../lib/logger');
var logger = new Logger('hdmdContract');
var ContractError = require('../lib/contractError');

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
var contractObj = contract.at(contractAddress);

var contractMath = require('../lib/contractMath');
contractMath.decimals = decimals;
let getRawNumber = contractMath.getRawNumber;
let getParsedNumber = contractMath.getParsedNumber;

/**
 *  Check that version of app matches deployed contract
 */
function checkVersion() {
   return new Promise(resolve => {
      var hdmdVersionDeployed = contractObj.version.call();
      if (hdmdVersionDeployed == hdmdVersion) {
         logger.log('HDMD contract matched.');
      } else {
         logger.log(
            `WARNING: HDMD contract version deployed is ${
               hdmdVersionDeployed
            } but app version is ${hdmdVersion}`
         );
      }
      resolve();
   });
}

/**
 * @return {Promise<BigNumber>} total supply
 */
function getTotalSupply() {
   return new Promise((resolve, reject) => {
      contractObj.totalSupply.call((err, res) => {
         if (err) {
            reject(err);
         } else {
            let parsed = contractMath.getParsedNumber(res);
            resolve(parsed);
         }
      });
   });
}

function getContractOwner(callback) {
   if (callback) {
      contractObj.owner.call(callback);
      return;
   }
   return new Promise((resolve, reject) => {
      contractObj.owner.call((err, res) => {
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
      contractObj.allowMinter(account, callback);
      return;
   }
   return new Promise((resolve, reject) => {
      contractObj.allowMinter(account, (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

function canMint() {
   return new Promise((resolve, reject) => {
      contractObj.canMint(defaultAccount, (err, canMint) => {
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
      contractObj.mint(rawAmount, (err, res) => {
         if (err) {
            reject(err);
         } else {
            resolve(res);
         }
      });
   });
}

function _unmint(amount) {
   let rawAmount = getRawNumber(amount).toNumber();

   return new Promise((resolve, reject) => {
      contractObj.unmint(rawAmount, (err, res) => {
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
   return _mint(amount).catch(err => {
      canMint().then(allowed => {
         if (!allowed) {
            let newErr = new Error(
               `Error minting: address ${defaultAccount} is not allowed to mint`
            );
            return Promise.reject(newErr);
         }
         return Promise.reject(`Error minting: ${err}`);
      });
   });
}

/**
 * Unmints amounts on HDMD smart contract
 * @param {<BigNumber>} amount - amount in BigNumber
 * @return {Promise} return value of the smart contract function
 */
function unmint(amount) {
   return _unmint(amount)
      .catch(err => {
         return canMint().then(allowed => {
            if (!allowed) {
               let newErr = new Error(
                  `Error unminting: address ${
                     defaultAccount
                  } is not allowed to mint`
               );
               return Promise.reject(newErr);
            }
            return Promise.reject(`Error unminting: ${err}`); // TODO: fix unhandled promise rejection
         });
      })
      .catch(err => {
         return Promise.reject(err);
      });
}

/**
 * Transfer tokens from sender's address to a list of addresses
 * @param {String[]} addresses - array of addresses to receive the tokens
 * @param {<BigNumber>[]} values - amounts to transfer
 * @return {Promise} return value of the smart contract function
 */
function batchTransfer(addresses, values) {
   return new Promise((resolve, reject) => {
      let rawValues = values.map(value => {
         if (value.lessThan(0)) {
            reject(
               new Error(
                  `reverseBatchTransfer value of ${
                     value
                  } must be greater than zero`
               )
            );
         }
         return getRawNumber(value).toNumber();
      });
      logger.log(`[Contract] Invoking 'Batch Transfer'...`);
      logger.debug(`
batchTransfer(${JSON.stringify(addresses)}, ${JSON.stringify(rawValues)})
`);
      contractObj.batchTransfer(
         addresses,
         rawValues,
         { gas: gasLimit },
         (error, result) => {
            if (error) {
               reject(
                  new ContractError(error.message, 'batchTransfer', {
                     addresses: addresses,
                     values: rawValues
                  })
               );
            } else {
               resolve(result);
            }
         }
      );
   });
}

/**
 * Transfer tokens from a list of addresses to the owner's address
 * @param {String[]} addresses - array of addresses to receive the tokens
 * @param {<BigNumber>[]} values - amounts to transfer
 * @return {Promise} return value of the smart contract function
 */
function reverseBatchTransfer(addresses, values) {
   return new Promise((resolve, reject) => {
      let rawValues = values.map(value => {
         if (value.lessThan(0)) {
            reject(
               new Error(
                  `reverseBatchTransfer value of ${
                     value
                  } must be greater than zero`
               )
            );
         }
         return getRawNumber(value).toNumber();
      });
      logger.log(`[Contract] Invoking 'Reverse Batch Transfer'...`);
      logger.debug(`
batchTransfer(${JSON.stringify(addresses)}, ${JSON.stringify(rawValues)})
`);
      contractObj.reverseBatchTransfer(
         addresses,
         rawValues,
         { gas: gasLimit },
         (error, result) => {
            if (error) {
               reject(
                  new ContractError(error.message, 'reverseBatchTransfer', {
                     addresses: addresses,
                     values: rawValues
                  })
               );
            } else {
               resolve(result);
            }
         }
      );
   });
}

module.exports = {
   checkVersion: checkVersion,
   web3: web3,
   contractObj: contractObj,
   abiDecoder: abiDecoder,
   getTotalSupply: getTotalSupply,
   getContractOwner: getContractOwner,
   allowMinter: allowMinter,
   canMint: canMint,
   mint: mint,
   unmint: unmint,
   batchTransfer: batchTransfer,
   reverseBatchTransfer: reverseBatchTransfer
};
