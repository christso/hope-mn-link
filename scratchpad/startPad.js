var BigNumber = require('bignumber.js');
var config = require('../config');
var requireSeed = config.requireSeed;

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');

var dmdClient = require('../client/dmdClient');
var hdmdClient = require('../client/hdmdClient');
var reconClient = require('../client/reconClient');
var allowMinter = hdmdClient.allowMinter;
var defaultAccount = hdmdClient.defaultAccount;
var batchTransfer = hdmdClient.batchTransfer;
var downloadTxns = reconClient.downloadTxns;
var getUnmatchedTxns = reconClient.getUnmatchedTxns;
var reconcile = reconClient.reconcile;

var dmdInterval = require('../models/dmdInterval');
const contribs = require('../data/hdmdContributions');
const accounts = contribs.accounts;
const decimals = config.hdmdDecimals;

const dmdTxns = require('../models/dmdTxn');
const hdmdTxns = require('../models/hdmdTxn');
const reconTxns = require('../models/reconTxn');
const queries = require('../client/databaseQueries');

const sinon = require('sinon');
const hdmdContract = require('../client/hdmdContract');

// connect to database
let connection = database.createTestConnection();

var createMocks = () => {
   return new Promise(resolve => {
      hdmdContractMock = sinon.mock(hdmdContract);
      hdmdClient.init(hdmdContractMock.object);

      sinon.stub(hdmdContractMock.object, 'getTotalSupply').callsFake(() => {
         return Promise.resolve(new BigNumber(13000));
      });

      resolve();
   });
};

createMocks().then(() => {
   var totalSupply;
   hdmdClient.getTotalSupply().then(supply => {
      console.log(`supply = ${supply}`);
   });
});

setInterval(() => true, 1000000);
