const Web3 = require('web3');
const abi = require('./hdmdABI')();

const hdmdVersion = 0.1;
const ethNodeAddress = 'http://localhost:8545';

var contractLocation = "0xc7ea471f6502d1b2d08cc6732e35b74ae850a100"; // testRPC
//var contractLocation = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

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

/*----- TODO: Create DMD listener -----*/

// Call the API every hour. 
// List new DMD transactions based on Date/Time or Block
// Create MongoDB document for each new DMD transaction, which stores the txn hash.
// List Balance: http://chainz.cryptoid.info/dmd/api.dws?q=getbalance&a=dH4bKCoyNj9BzLuyU4JvhwvhYs7cnogDVb
// List Txns: https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js

/*----- Create HDMD listener -----*/


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
