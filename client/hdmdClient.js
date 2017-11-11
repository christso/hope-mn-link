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

/*----- Create HDMD listener -----*/

function downloadTxns() {
    // TODO: get the latest block instead of hardcoding 7000
    console.log(web3.eth.blockNumber)// <- This gets last block on local chain as set up now.
    return filterEventsGet(7000).then(eventLog => {
        //console.log('--- DMD Txn Log ---', eventLog);
        return eventLog;
    }).then((eventLog) =>
        parseEventLog(eventLog))
        //TODO: fix eventLog == undefined
        .catch(error => console.log('--- Error downloading DMD Txn Log ---', error)
        )
}

var filter;
function filterEventsGet(fromBlock) {
    return new Promise((resolve, reject) => {
        filter = web3.eth.filter({ fromBlock: fromBlock, toBlock: 'latest', address: contractAddress });
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
    console.log(eventLog)
    let decodedLog = abiDecoder.decodeLogs(eventLog);
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
            newTxn.dmdAddres = decoded.events[1].value;
            newTxn.value = decoded.events[2].value;
        }
        console.log('Parsed HDMD Txn', newTxn);
    }
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
*/
function saveToMongo(event) {
    event.save().then((doc) => {
        console.log('saved', doc)
    }, (err) => {
        console.log('Unable to save data')
    });
}


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
                reject(res);
            } else {
                resolve(err);
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
