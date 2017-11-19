const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');

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

/**
 *  Check that version of app matches deployed contract
 */
function checkVersion() {
   return new Promise(resolve => {
      var hdmdVersionDeployed = contractObj.version.call();
      if (hdmdVersionDeployed == hdmdVersion) {
         console.log('HDMD contract matched.');
      } else {
         console.log(
            `WARNING: HDMD contract version deployed is ${hdmdVersionDeployed} but app version is ${hdmdVersion}`
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

module.exports = {
   checkVersion: checkVersion,
   web3: web3,
   contractObj: contractObj,
   abiDecoder: abiDecoder,
   getTotalSupply: getTotalSupply,
   getContractOwner: getContractOwner,
   allowMinter: allowMinter
};
