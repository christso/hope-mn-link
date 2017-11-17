var config = require('./config');
var port = config.port;

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var axios = require('axios').default;
var app = express();
var reconClient = require('./client/reconClient');
var hdmdClient = require('./client/hdmdClient');
var dmdClient = require('./client/dmdClient');

var synchronizeAll = reconClient.synchronizeAll;

// reconcile transactions at each interval
let watchInterval = config.dmdWatchInterval;

setInterval(() => {
   return Promise.all([hdmdClient.seedData(), dmdClient.seedData()])
      .then(() => synchronizeAll())
      .catch(err => console.log(err.stack))
      .then(() => (config.requireSeed = false));
}, watchInterval);

// allows you to parse JSON into req.body.field
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Requiring Routes
var dmdRoutes = require('./routes/dmd');
var hdmdRoutes = require('./routes/hdmd');
var reconRoutes = require('./routes/recon');

// change the address on deployment
// NOTE: If you get an error connecting, reveiew https://github.com/Automattic/mongoose/issues/5399
mongoose.connect(config.mongodbUri, {
   useMongoClient: true,
   promiseLibrary: global.Promise
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, '# MongoDB - connection error: '));

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/dmd', dmdRoutes);
app.use('/api/hdmd', hdmdRoutes);
app.use('/api/recon', reconRoutes);

app.listen(port, function() {
   console.log(`HTTP Server is listening on http://localhost:${port}`);
});
