const assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire');

const hdmdClient = require('../client/hdmdClient');
const hdmdContract = require('../client/hdmdContract');
const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const dmdIntervals = require('../models/dmdInterval');
const seeder = require('../client/seeder');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');

const cleanup = false;

describe('HDMD Database Tests', () => {
   var connection;
   const initialSupply = 12000;

   var hdmdContractMock;

   var dmdBlockIntervals = [18386, 18388, 18584, 23742, 27962, 28022].map(b => {
      return { blockNumber: b };
   });
});
