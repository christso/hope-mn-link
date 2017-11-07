// This will list HDMD contract on the eth network

const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
const hdmdTxns = require('../models/hdmdTxn');
const abiDecoder = require('abi-decoder');

const hdmdVersion = config.hdmdVersion;
const ethNodeAddress = config.ethNodeAddress;

var contractLocation = config.hdmdContractLocation;

// set the Web3 to where we need to connect
var web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));

abiDecoder.addABI(abi);

// set default account to use as msg.sender to contract
// this account will need to be added via allowMinter to be able to invoke mint()
web3.eth.defaultAccount = web3.eth.coinbase;

// Set up a contract with interface
var contract = web3.eth.contract(abi);
// Instantiate contact so we can interact
var hdmdContract = contract.at(contractLocation);

var filter=web3.eth.filter({fromBlock: 0, toBlock: 9999999, address: contractLocation});
filter.get(function(error, log) {
  console.log(log);
  console.log('decoded', abiDecoder.decodeLogs(log));
});



//filter.stopWatching(); 