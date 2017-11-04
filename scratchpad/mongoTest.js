var config = require('../config');
var express = require('express');
var router = express.Router();
var axios = require('axios').default;
var mongoose = require('mongoose');
var client = require('../client/dmdClient');

mongoose.connect(config.mongodbUri, { useMongoClient: true, promiseLibrary: global.Promise });
var db = mongoose.connection;
db.on('error', console.error.bind(console, '# MongoDB - connection error: '));

var DmdTxns = require('../models/dmdTxn');

var txnData = [
    {
        "hash": "DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC",
        "block": 18386,
        "amount": 10000,
        "balance": 10000
    },
    {
        "hash": "D8FC32F7084C9AA4EEA65B2A12B90BADF0A526015FF081D9E2E8A19E6E0085B4",
        "block": 18584,
        "amount": 1.5275,
        "balance": 10001.5275
    },
    {
        "hash": "15AF02476D9382FA7C70A5904B76294BFF3B0F4D134D5807C5A227AB5B2F6F2A",
        "block": 18759,
        "amount": 1.5275,
        "balance": 10003.055
    }
];


var newTxn =     {
    hash: "15AF02476D9382FA7C70A5904B76294BFF3B0F4D134D5807C5A227AB5B2F6F2A",
    block: 18759,
    amount: 1.5275,
    balance: 10003.055
};

DmdTxns.create(txnData, function(err, txn) {
    if (err) {
        console.log("Error" + err);
    } else {
        console.log("Added a txn");
    }
});