var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var app = express();
var port = 8080;

//uncomment below once we set up mongo
//mongoose.connect("mongodb://localhost/hdmdlink");

app.use(bodyParser.urlencoded({extended: true}));

// web3 event listener
var evntAll = require('./app').evntAll;

app.get("/hdmd/balances", function(req, res) {
    // Get all account balances of HDMD token holders
    
});

app.get("/hdmd/mint", function(req, res) {
    // invoke mint() manually
    
});

app.listen(port, function() {
    console.log(`HTTP Server is listening on http://localhost:${port}`);
})