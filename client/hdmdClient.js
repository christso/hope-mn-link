const Web3 = require('web3');
const abi = require('./hdmdABI')();
const config = require('../config');
const hdmdTxns = require('../models/hdmdTxn');
const hdmdBurn = require('../models/hdmdBurn');
const accounts = require('../data/hdmdAccounts');
const wallet = require('../client/dmdWallet');

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
var hdmdContract = contract.at(contractAddress);

// Check that version of app matches deployed contract
var hdmdVersionDeployed = hdmdContract.version.call();
if (hdmdVersionDeployed == hdmdVersion) {
    console.log("HDMD contract matched.");
} else {
    console.log(`ERROR: HDMD contract version deployed is ${hdmdVersionDeployed} but app version is ${hdmdVersion}`);
}

// TODO: If there are 1000+ transactions in the event log filter
// then downloadTxns will take a very long time to finish executing.

function downloadTxns() {
    return getLastSavedTxn().then((docs) => {
        // get last block number that was saved in MongoDB
        let lastSavedBlockNumber = 0;
        if (docs.length > 0) {
            lastSavedBlockNumber = docs[0].blockNumber;
        }
        return lastSavedBlockNumber;
    }).then((lastSavedBlockNumber) => 
        // get event logs after the last block number that we saved
        filterEventsGet(lastSavedBlockNumber).then(eventLog => eventLog).then((eventLog) =>
        // parse the event log
        parseEventLog(eventLog)
    ).then((newTxns) =>
        // save the newTxns into MongoDB
        saveTxns(newTxns)
    ).catch(error => 
        console.log('--- Error downloading DMD Txn Log ---', error)
    ));
}

var filter;
function filterEventsGet(fromBlock) {
    return new Promise((resolve, reject) => {
        // fromBlock needs to be greater than the last saved block
        filter = web3.eth.filter({ fromBlock: fromBlock + 1, toBlock: 'latest', address: contractAddress });
        filter.get(function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

function parseEventLog(eventLog) {
    return new Promise((resolve, reject) => {
        let decodedLog = abiDecoder.decodeLogs(eventLog);
        let newTxns = [];
        newTxns.length = eventLog.length;
        for (var i = 0; i < eventLog.length; i++) {
            let event = eventLog[i];
            let decoded = decodedLog[i];
            let eventName = decoded.name;
            let newTxn = {
                txnHash: event.transactionHash,
                blockNumber: event.blockNumber,
                eventName: eventName
            };
            if (eventName === 'Mint') {
                newTxn.sender = decoded.events[0].value;
                newTxn.amount = decoded.events[1].value;
                newTxn.dmdTxn = decoded.events[2].value;
            } else if (eventName === 'Burn') {
                newTxn.sender = decoded.events[0].value;
                newTxn.dmdAddress = decoded.events[1].value;
                newTxn.amount = decoded.events[2].value;
            } else if (eventName === 'Transfer') {
                // TODO: add logic here
            }
            newTxns[i] = newTxn;
            console.log('Parsed HDMD Txn', newTxn);
        }
        resolve(newTxns);
    });
}

function getLastSavedTxn() {
    // TODO: instead of hardcoding number, get the last block from MongoDB
    return hdmdTxns.find().sort({ blockNumber: -1 }).limit(1).exec();
}

function saveTxns(newTxns) {
    return hdmdTxns.create(newTxns);
}

// TODO: saveTxns(arguments[1]);

/*
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

        apportion(newTransaction.amount, defaultAccount)
            .then(res => console.log('Apportioned tokens with Batch Transfer', res))
            .catch(err => console.log('Unable to apportion tokens', err));
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

        wallet.sendToAddress(newTransaction.dmdAddress, newTransaction.amount)
            .then(result => console.log(result))
            .catch(err => console.log(err));
    }

}
function saveToMongo(event) {
    event.save().then((doc) => {
        console.log('saved', doc)
    }, (err) => {
        console.log('Unable to save data')
    });
}
*/

function getBalances() {
    return new Promise((resolve, reject) => {
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
            resolve(balances);
            return;
        }

        accounts.forEach(account => {
            hdmdContract.balanceOf(account, (err, value) => {
                let done = () => accounts_processed === totalAccounts;
                appendBalance(err, value);
                if (done()) {
                    createMapping(accounts);
                }
            });
        });
    });
}

// Used to distribute the minted amount to addresses in proportion to their balances
// fundingAddress should be the account that did the minting = web3.eth.defaultAccount
function apportion(amount, fundingAddress) {
    return new Promise((resolve, reject) => {
        getBalances()
            .then(balances => {
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
                resolve(batchTransfer(addresses, addValues));
            })
            .catch(err => reject(err));
    });
}

function batchTransfer(addresses, values) {
    return new Promise((resolve, reject) => {
        hdmdContract.batchTransfer(addresses, values, { gas: gasLimit }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    })
}

function getFormattedValue(value) {
    return value / (10 ** decimals);
}

function getRawValue(value) {
    return value * (10 ** decimals);
}

function mint(amount, dmdTxnHash, callback) {
    if (callback) {
        hdmdContract.mint(amount, dmdTxnHash, callback);
        return;
    }
    return new Promise((resolve, reject) => {
        hdmdContract.mint(amount, dmdTxnHash, (err, res) => {
            if (err) {
                Promise.reject(res);
            } else {
                Promise.resolve(err);
            }
        });
    });
}

module.exports = {
    web3: web3,
    hdmdContract: hdmdContract,
    getBalances: getBalances,
    batchTransfer: batchTransfer,
    getFormattedValue: getFormattedValue,
    getRawValue: getRawValue,
    mint: mint,
    downloadTxns: downloadTxns
}
