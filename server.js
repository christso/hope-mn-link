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
var contract = contractApp.hdmdContract;

// Get all account balances of HDMD token holders
app.get("/hdmd/balances", function(req, res) {
    
 
});

app.get("/hdmd/mint", function(req, res) {
    // invoke mint() manually
    
});

app.listen(port, function() {
    console.log(`HTTP Server is listening on http://localhost:${port}`);
})