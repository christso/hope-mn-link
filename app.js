var timers = require('timers');
var setTimeout = timers.setTimeout;

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
var synchronizeAll = reconClient.synchronizeAll;
var downloadTxns = reconClient.downloadTxns;
var allowThisMinter = hdmdClient.allowThisMinter;

// reconcile transactions at each interval
let watchInterval = config.dmdWatchInterval;

function syncTask() {
   logger.log('Starting Download...');
   return downloadTxns()
      .catch(err => {
         logger.error(err);
      })
      .then(() => {
         logger.log('Starting Sync...');
         return setTimeout(synchronizeAll, 0);
      })
      .then(() => {
         logger.log(
            `Starting Next Sync after ${watchInterval} milliseconds...`
         );
         return setTimeout(syncTask, watchInterval);
      })
      .catch(err => {
         logger.error(err.stack);
      });
}

contract
   .checkVersion()
   .then(() => allowThisMinter())
   .then(() => seedAll())
   .then(() => syncTask())
   .catch(err => logger.error(err.stack));

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
