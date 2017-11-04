const Web3 = require('web3');
const abi = require('./hdmdABI')();

const hdmdVersion = 0.1;
const ethNodeAddress = 'http://localhost:8545';

//var contractLocation = "0xc7ea471f6502d1b2d08cc6732e35b74ae850a100"; // testRPC
var contractLocation = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

// set the Web3 to where we need to connect
var web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));

// Set up a contract with interface
var contract = web3.eth.contract(abi);
// Instantiate contact so we can interact
var hdmdContract = contract.at(contractLocation);

// Check that version of app matches deployed contract
var hdmdVersionDeployed = hdmdContract.version.call();
if (hdmdVersionDeployed == hdmdVersion) {
    console.log("HDMD contract matched.");
} else {
    console.log(`ERROR: HDMD contract version deployed is ${hdmdVersionDeployed} but app version is ${hdmdVersion}`);
}

// create accounts

//web3.eth.accounts.privateKeyToAccount('8f3916e61a5a2506c6e97325c93791b61938c701c6d5f0104b81a5fa22df337c');

console.log(`Listening for changes on the blockchain on node ${ethNodeAddress}`);
// Listen to all event that can occur, Mint/Burn
var evntAll = hdmdContract.allEvents({}, { fromBlock: 0, toBlock: 'latest' });
evntAll.watch(function(error, result) {
   console.log('listening for changes on the blockchain...');
   console.log(arguments);
});

module.exports = function () {
    this.evntAll = evntAll;
    this.web3 = web3;
    this.hdmdContract = hdmdContract;
}
