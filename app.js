var config = require('./config');
var port = config.port;
var Logger = require('./lib/logger');
var logger = new Logger('App');

var express = require('express');
var bodyParser = require('body-parser');
var axios = require('axios').default;
var app = express();
var reconClient = require('./client/reconClient');
var hdmdClient = require('./client/hdmdClient');
var dmdClient = require('./client/dmdClient');
var seeder = require('./client/seeder');
var database = require('./client/database');
var contract = require('./client/hdmdContract');

var seedAll = seeder.seedAll;
var synchronizeNext = reconClient.synchronizeNext;
var downloadTxns = reconClient.downloadTxns;
var allowThisMinter = hdmdClient.allowThisMinter;
var saveInitialSupply = hdmdClient.saveTotalSupplyDiff;

// reconcile transactions at each interval
let watchInterval = config.dmdWatchInterval;

let syncTask = downloadTxns()
   .then(() => synchronizeNext())
   .then(() => {
      if (config.requireSeed) {
         config.requireSeed = false;
      }
   });

contract
   .checkVersion()
   .then(() => allowThisMinter())
   .then(() => seedAll())
   .then(() => {
      return syncTask().then(() => {
         return setInterval(() => {
            return syncTask();
         }, watchInterval);
      });
   })
   .catch(err => logger.log(err.stack));

// allows you to parse JSON into req.body.field
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Requiring Routes
var dmdRoutes = require('./routes/dmd');
var hdmdRoutes = require('./routes/hdmd');
var reconRoutes = require('./routes/recon');

// connect to database
database.connect();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/dmd', dmdRoutes);
app.use('/api/hdmd', hdmdRoutes);
app.use('/api/recon', reconRoutes);

app.listen(port, function() {
   logger.log(`HTTP Server is listening on http://localhost:${port}`);
});
