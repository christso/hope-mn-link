var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Logger = require('../lib/logger');
var logger = new Logger('MongoDB');
var mongodb = require('mongodb');

function connect() {
   let databaseName = config.mongodbUri;
   mongoose.connect(config.mongodbUri, {
      useMongoClient: true,
      promiseLibrary: global.Promise
   });
   var db = mongoose.connection;
   db.on('error', logger.error.bind(console, `connection error:`));
   db.once(
      'open',
      logger.log.bind(console, `We are connected to database ${databaseName}`)
   );
}

function createTestConnection() {
   return new Promise((resolve, reject) => {
      let databaseName = config.mongodbUriTest;
      mongoose.connect(
         config.mongodbUriTest,
         {
            useMongoClient: true,
            promiseLibrary: global.Promise
         },
         (err, db) => {
            if (err) {
               reject(err);
            } else {
               db.on('error', logger.error.bind(console, `connection error:`));
               db.once('open', function() {
                  db.once(
                     'open',
                     logger.log.bind(
                        console,
                        `We are connected to database ${databaseName}`
                     )
                  );
               });
               resolve(db);
            }
         }
      );
   });
}

function disconnect() {
   let connection = mongoose.connection;
   return connection.close();
}

function dropDatabase() {
   var connection = mongoose.connection;
   return new Promise((resolve, reject) => {
      return connection.db.dropDatabase(function() {
         return resolve(connection);
      });
   });
}

function dropAndCreateTestDatabase() {
   return createTestConnection()
      .then(() => dropDatabase())
      .then(() => disconnect())
      .then(() => createTestConnection());
}

function dropDatabaseAndDisconnect(connection) {
   return connection.db.dropDatabase(function() {
      connection.close();
   });
}

module.exports = {
   connect: connect,
   createTestConnection: createTestConnection,
   dropDatabase: dropDatabase,
   disconnect: disconnect,
   dropAndCreateTestDatabase: dropAndCreateTestDatabase
};
