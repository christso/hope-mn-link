var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var app = express();
var port = 8080;

//uncomment below once we set up mongo
//mongoose.connect("mongodb://localhost/hdmdlink");

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

// execute contract app
var contractAppImport = require('./app.js');
var contractApp = new contractAppImport();
var hdmdContract = contractApp.hdmdContract;
var web3 = contractApp.web3;

var accounts = require('./data/hdmdAccounts');

// Get all account balances of HDMD token holders
// TODO: Make this run faster. We should cache results.
app.get("/api/hdmd/balances", function(req, res) {

    let balances = accounts.map((account) => {
        let balance = hdmdContract.balanceOf(account);
        return { address: account, value: balance }
    });
    res.json(balances);
});

// List accounts that hold HDMD
app.get("/api/hdmd/accounts", function(req, res) {
    res.json(accounts);
});

app.get("/api/hdmd/batchtransfer", function(req, res) {
    // invoke mint() manually
    
});

app.get("/api/hdmd/mint", function(req, res) {
    // invoke mint() manually
    
});

app.get("/api/hdmd/totalsupply", function(req, res) {
    // Return total supply. Should be 10000 if no tokens were minted
    res.send(hdmdContract.totalSupply.call());
});

app.listen(port, function() {
    console.log(`HTTP Server is listening on http://localhost:${port}`);
})