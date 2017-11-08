const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
var hdmdTxns = require('../models/hdmdTxn');
var hdmdBurn = require('../models/hdmdBurn');
var accounts = require('../data/hdmdAccounts');

const hdmdVersion = config.hdmdVersion;
const ethNodeAddress = config.ethNodeAddress;

var contractLocation = config.hdmdContractLocation;
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
    console.log('Debugging', arguments[1]); // for Debugging
    // saveTxns(parseTxInfo(arguments[1]));
    saveTxns(arguments[1]);
});



function saveTxns(newTxns) {
    // Create new DMD txn and save to DB
    if (newTxns.event === 'Mint') {
        var newTransaction = hdmdTxns({
            // txnHash: parsedEvent.txnHash,
            // blockNumber: parsedEvent.blockNumber,
            // amount: parsedEvent.amount,
            // dmd_txnHash: parsedEvent.dmd_txn
            txnHash: newTxns.args.transactionHash,
            blockNumber: newTxns.args.blockNumber,
            amount: newTxns.args._reward.c[0],
            dmd_txnHash: newTxns.args._dmdTx
        });
        saveToMongo(newTransaction);
        // TODO: fix Error: VM Exception while processing transaction: out of gas
        apportion(getRawValue(newTransaction.amount), defaultAccount, function(err, res) {
            if (err) {
                console.log('Unable to apportion tokens', err);
            } else {
                console.log('Apportioned tokens with Batch Transfer', res);
            }
        });
    }
    if (newTxns.event === 'Burn') {
        var newTransaction = hdmdBurn({
            burner: newTxns.args.burner,
            dmdAddress: newTxns.args.dmdAddress,
            txnHash: newTxns.txnHash,
            blockNumber: newTxns.blockNumber,
            amount: newTxns.amount,
            txnHash: newTxns.dmd_txn
        });
        saveToMongo(newTransaction);
    }

}
function saveToMongo(event) {
    event.save().then((doc) => {
        console.log('saved', doc)
    }, (err) => {
        console.log('Unable to save data')
    });
}

function getBalances(callback) {
    let accounts_processed = 0;
    let total = accounts.length;
    let values = [];
    try {
        for (var i = 0, len = accounts.length; i < len; i++) {
            hdmdContract.balanceOf(accounts[i], (err, value) => {
                let account = accounts[i];
                // push to array
                if (err || !value.c) {
                    values.push(0);
                } else {
                    values.push(value.c[0]);
                }
                accounts_processed = accounts_processed + 1;
                // when done
                let balances = [];
                if (accounts_processed === total) {
                    for (var i = 0; i < accounts.length; i++) {
                        balances.push({ address: accounts[i], value: values[i] });
                    }
                    callback(null, balances);
                    return;
                }
            });
        }
    } catch (err) {
        callback(err);
    }
}

// Used to distribute the minted amount to addresses in proportion to their balances
// fundingAddress should be the account that did the minting = web3.eth.defaultAccount
function apportion(amount, fundingAddress, callback) {
    getBalances(function(err, balances) {
        let addresses = balances.map((el) => {
            return el.address;
        });
        let oldAmounts = balances.map((el) => {
            return el.value;
        });
        let oldTotal = oldAmounts.reduce((a,b) => a + b, 0);
    
        // subtract value so we get balance before minting
        balances[fundingAddress] -= amount; 
    
        let addValues = oldAmounts.map((oldValue) => {
            return oldValue / oldTotal * amount;
        });
    
        console.log('calling batchTransfer');
        console.log('addresses', JSON.stringify(addresses));
        console.log('values', JSON.stringify(addValues));

        batchTransfer(addresses, addValues, callback);
    });
}

function batchTransfer(addresses, values, callback) {
    hdmdContract.batchTransfer(addresses, values, {gas: gasLimit}, callback);
}

function getFormattedValue(value) {
    return value / (10**decimals);
}

function getRawValue(value) {
    return value * 10**decimals;
}

module.exports = {
    evntAll: evntAll,
    web3: web3,
    hdmdContract: hdmdContract,
    getBalances: getBalances,
    batchTransfer: batchTransfer,
    getFormattedValue: getFormattedValue,
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
