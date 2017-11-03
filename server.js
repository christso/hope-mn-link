var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var app = express();
var port = 8080;

//uncomment below once we set up mongo
//mongoose.connect("mongodb://localhost/hdmdlink");

app.use(bodyParser.urlencoded({extended: true}));

// execute contract app
var contractAppImport = require('./app.js');
var contractApp = new contractAppImport();
var hdmdContract = contractApp.hdmdContract;

// Get all account balances of HDMD token holders
app.get("/api/hdmd/balances", function(req, res) {
    var balances = [
        { '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3': 2670.684995 },
        { '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1': 477.3448233 },
        { '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3': 1288.831023 }
    ]
    res.json(balances);
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