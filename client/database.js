var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

function connect() {
   mongoose.connect(config.mongodbUri, {
      useMongoClient: true,
      promiseLibrary: global.Promise
   });
   var db = mongoose.connection;
   db.on(
      'error',
      console.error.bind(console, '# MongoDB - connection error: ')
   );
}

module.exports = {
   connect: connect
};
