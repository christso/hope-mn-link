const Web3 = require('web3');
const getABI = require('./getABI');

var abi = getABI.abi();
var contractLocation = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C';

// set the Web3 to where we need to connect
// TODO, variable perhaps?
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

// TODO
// Delete, we dont need this i guess.

// Set up a contract with interface
var contract = web3.eth.contract(abi);
// Instantiate contact so we can interact
var HDMDcontract = contract.at(contractLocation);

console.log('listening for changes on the blockchain...');
// Listen to all event that can occur, Mint/Burn
var evntAll = HDMDcontract.allEvents({}, { fromBlock: 0, toBlock: 'latest' });
evntAll.watch(function(error, result) {
   console.log('listening for changes on the blockchain...');
   console.log(arguments);
});
