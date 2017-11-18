const assert = require('assert');
const hdmdClient = require('../client/hdmdClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');

var database = require('../client/database');

var connection;

let test = () => {
   database
      .createTestConnection()
      .then(c => {
         connection = c;
         database.dropDatabase(connection);
      })
      .then(() => database.disconnect(connection))
      .then(() => {
         connection = database.createTestConnection();
      })
      .catch(err => console.log(err));
};

test();

setInterval(() => true, 1000000);
