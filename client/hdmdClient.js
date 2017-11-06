const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
var hdmdTxns = require('../models/hdmdTxn');

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
    console.log(arguments[1]); // for Debugging
    saveTxns(parseTxInfo(arguments[1]));
});



function saveTxns(newTxns) {
    console.log(newTxns);
    // Create new DMD txn and save to DB
    var newTransaction = hdmdTxns({
        txnHash: newTxns.txnHash,
        blockNumber: newTxns.blockNumber,
        amount: newTxns.amount,
        dmd_txnHash: newTxns.dmd_txn
    });

    newTransaction.save().then((doc) => {
        console.log('saved', doc)
    }, (err) => {
        console.log('Unable to save data')
    });
}


// Pass this info to saveTxns so it can be put in to Mongo
// This is a bit messy to be honest but it gets the DMD Txn.
// Play around with it for a bit. your map solution looks nice to. but i dont know
// if that would work here, @Christso looks like you made a mapper further down.
function parseTxInfo(args) {
    return {
        txnHash: args.transactionHash,
        blockNumber: args.blockNumber,
        amount: args.args._reward.c[0],
        dmd_txn: args.args._dmdTx
        // address: arguments[1].address,
        // eventType: arguments[1].event,
        // hdmdTx: arguments[1].transactionHash,
    };
}

module.exports = {
    evntAll: evntAll,
    web3: web3,
    hdmdContract: hdmdContract,
    mint: (amount, dmdTxnHash, callback) => {    
        try {
            let txnHash = hdmdContract.mint(amount, dmdTxnHash);
            callback(null, txnHash);
        } catch (err) {
            callback(err, null);
        }
    },
    // mintParams: [{amount, dmdTxnHash}, {amount, dmdTxnHash}, ...]
    batchMint: (mintParams) => {
        if (mintParams != Array) {
            mintParams = [mintParams];
        }
        amounts = mintParams.map((m) => {
            return m.amount;
        });
        dmdTxnHashes = mintParams.map((m) => {
            return m.dmdTxnHash;
        });
        try {
            let txnHash = hdmdContract.batchMint(amouts, dmdTxnHashes);
            callback(null, txnHash);
        } catch (err) {
            callback(err, null);
        }
    }
}
