var config = require('./config');
var port = config.port;

var express = require('express');
var bodyParser = require('body-parser');
var axios = require('axios').default;
var app = express();
var reconClient = require('./client/reconClient');
var hdmdClient = require('./client/hdmdClient');
var dmdClient = require('./client/dmdClient');
var seeder = require('./client/seeder');
var database = require('./client/database');

var seedAll = seeder.seedAll;
var synchronizeAll = reconClient.synchronizeAll;
var allowThisMinter = hdmdClient.allowThisMinter;
var saveInitialSupply = hdmdClient.saveTotalSupplyDiff;

// reconcile transactions at each interval
let watchInterval = config.dmdWatchInterval;

allowThisMinter()
   .then(() => seedAll())
   .then(() =>
      setInterval(() => {
         return synchronizeAll()
            .then(() => (config.requireSeed = false))
            .catch(err => console.log(err));
      }, watchInterval)
   );

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
   console.log(`HTTP Server is listening on http://localhost:${port}`);
});
