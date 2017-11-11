var config = require('./config');

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var axios = require('axios').default;
var app = express();
var port = config.port;

// Pull DmdTxns and HdmdTxns

let dmdClient = require('./client/dmdClient');
let hdmdClient = require('./client/hdmdClient');
let watchInterval = config.dmdWatchInterval;

function downloadDmdTxns() {
    return dmdClient.downloadTxns().then(result => {
        if (result) {
            console.log('Downloaded DMD Transactions from CryptoID', result);
        } else {
            console.log('Downloaded DMD Transactions from CryptoID - no changes found');
        }
    }).catch(err => {
        console.log('Error downloading from DMD CryptoID and saving to DB', err);
    });
}

function downloadHdmdTxns() {
    // TODO
    //hdmdClient.downloadTxns();
}

function downloadTxns() {
    downloadDmdTxns();
    downloadHdmdTxns();
}

setInterval(() => downloadTxns(), watchInterval);

// allows you to parse JSON into req.body.field
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Requiring Routes
var dmdRoutes = require('./routes/dmd');
var hdmdRoutes = require('./routes/hdmd');

// change the address on deployment
// NOTE: If you get an error connecting, reveiew https://github.com/Automattic/mongoose/issues/5399
mongoose.connect(config.mongodbUri, { useMongoClient: true, promiseLibrary: global.Promise });
var db = mongoose.connection;
db.on('error', console.error.bind(console, '# MongoDB - connection error: '));

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

app.use('/api/dmd', dmdRoutes);
app.use('/api/hdmd', hdmdRoutes);

app.listen(port, function () {
    console.log(`HTTP Server is listening on http://localhost:${port}`);
})