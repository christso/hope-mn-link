const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
// const mongoose = require('mongoose');

const hdmdVersion = config.hdmdVersion;
const ethNodeAddress = config.ethNodeAddress;

var contractLocation = config.hdmdContractLocation;

// set the Web3 to where we need to connect
var web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));

// set default account to use as msg.sender to contract
// this account will need to be added via allowMinter to be able to invoke mint()
web3.eth.defaultAccount = web3.eth.coinbase;

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

/*----- Create HDMD listener -----*/

console.log(`Listening for changes on the blockchain on node ${ethNodeAddress}`);
// Listen to all event that can occur, Mint/Burn
var evntAll = hdmdContract.allEvents({}, { fromBlock: 0, toBlock: 'latest' });
evntAll.watch(function (error, result) {
    console.log('listening for changes on the blockchain...');
    console.log(arguments);
    //console.log(parseTxInfo(arguments));
});

function parseTxInfo(arguments) {
    var parsed = {
        address: arguments[1].address,
        blockNr: arguments[1].blockNumber,
        eventType: arguments[1].event,
        reward: arguments[1]._reward.c,
        tx: arguments[1].transactionHash,
        hdmdTx: arguments[1].transactionHash,
        dmdTx: "Fake_For_Now"
    };
    return parsed;
}

module.exports = function () {
    this.evntAll = evntAll;
    this.web3 = web3;
    this.hdmdContract = hdmdContract;
}
