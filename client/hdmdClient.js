const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
const hdmdTxns = require('../models/hdmdTxn');
const hdmdBurn = require('../models/hdmdBurn');
const accounts = require('../data/hdmdAccounts');
const wallet = require('../client/dmdWallet');

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
    saveTxns(arguments[1]);
});

function saveTxns(newTxns) {
    // Create new DMD txn and save to DB
    if (newTxns.event === 'Mint') {
        var newTransaction = hdmdTxns({
            txnHash: newTxns.args.transactionHash,
            blockNumber: newTxns.args.blockNumber,
            amount: newTxns.args._reward.c[0],
            dmd_txnHash: newTxns.args._dmdTx
        });

        saveToMongo(newTransaction);

        apportion(newTransaction.amount, defaultAccount, function (err, res) {
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
            txnHash: newTxns.transactionHash,
            blockNumber: newTxns.blockNumber,
            amount: newTxns.args.value.c[0]
        });
        saveToMongo(newTransaction);
        wallet.sendToAddress(newTransaction.dmdAddress, newTransaction.amount, function (error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });
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
    let totalAccounts = accounts.length;
    let values = [];

    let appendBalance = (err, value) => {
        if (err || !value.c) {
            values.push(0);
        } else {
            values.push(value.c[0]);
        }
        accounts_processed = accounts_processed + 1;
    }

    let balances = [];
    let createMapping = (accounts) => {
        for (var i = 0; i < accounts.length; i++) {
            balances.push({ address: accounts[i], value: values[i] });
        }
        callback(null, balances);
        return;
    }

    try {
        for (var i = 0, len = accounts.length; i < len; i++) {
            hdmdContract.balanceOf(accounts[i], (err, value) => {
                let done = () => accounts_processed === totalAccounts;
                appendBalance(err, value);
                if (done()) {
                    createMapping(accounts);
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
    getBalances(function (err, balances) {
        let addresses = balances.map((el) => {
            return el.address;
        });
        let oldAmounts = balances.map((el) => {
            return el.value;
        });
        let oldTotal = oldAmounts.reduce((a, b) => a + b, 0);

        // subtract value so we get balance before minting
        balances[fundingAddress] -= amount;

        let addValues = oldAmounts.map((oldValue) => {
            return Math.floor(oldValue * amount / oldTotal);
        });

        // console.log('calling batchTransfer');
        // console.log('addresses', JSON.stringify(addresses));
        // console.log('values', JSON.stringify(addValues));

        batchTransfer(addresses, addValues, callback);
    });
}

function batchTransfer(addresses, values, callback) {
    hdmdContract.batchTransfer(addresses, values, { gas: gasLimit }, callback);
}

function getFormattedValue(value) {
    return value / (10 ** decimals);
}

function getRawValue(value) {
    return value * (10 ** decimals);
}

function mint(amount, dmdTxnHash, callback) {
    hdmdContract.mint(amount, dmdTxnHash, callback);
}

module.exports = {
    evntAll: evntAll,
    web3: web3,
    hdmdContract: hdmdContract,
    getBalances: getBalances,
    batchTransfer: batchTransfer,
    getFormattedValue: getFormattedValue,
    getRawValue: getRawValue,
    mint: mint
}
