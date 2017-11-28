var sinon = require('sinon');
const uuidv1 = require('uuid/v1');
const BigNumber = require('bignumber.js');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var database = require('../client/database');
var queries = require('../client/databaseQueries');

const formatter = require('../lib/formatter');
var typeConverter = require('../lib/typeConverter');
const hdmdContract = require('../client/hdmdContract');
const hdmdClient = require('../client/hdmdClient');
const hdmdEvents = require('../test_modules/hdmdEventModel');

var ownerAccount = '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC';

/**
 * Get the latest block number in the HDMD event log
 */
function getLastHdmdBlockNumber() {
   return hdmdEvents
      .find({})
      .sort({ blockNumber: -1 })
      .limit(1)
      .then(found => (found[0] ? found[0].blockNumber : 0));
}

function batchTransferFaker(addresses, values) {
   if (addresses.length != values.length) {
      throw new Error('addresses must have the seame length as values');
   }

   let events = [];
   let txnHash = formatter.formatUuidv1(uuidv1());
   let bnTotalAmount = new BigNumber(0);
   if (values != undefined && values != null) {
      values.forEach(value => {
         return (bnTotalAmount = bnTotalAmount.plus(value));
      });
   }

   return getLastHdmdBlockNumber().then(blockNumber => {
      let newBlockNumber = blockNumber + 1;

      events.push({
         txnHash: txnHash,
         blockNumber: newBlockNumber,
         amount: typeConverter.numberDecimal(bnTotalAmount.times(-1)),
         netAmount: typeConverter.numberDecimal(bnTotalAmount.times(-1)),
         account: ownerAccount,
         eventName: 'Transfer'
      });

      for (let i = 0; i < addresses.length; i++) {
         events.push({
            txnHash: txnHash,
            blockNumber: newBlockNumber,
            amount: typeConverter.numberDecimal(values[i]),
            netAmount: typeConverter.numberDecimal(values[i]),
            account: addresses[i],
            eventName: 'Transfer'
         });
      }

      return hdmdEvents.create(events);
   });
}

module.exports = function(initialSupply) {
   let mocked = sinon.mock(hdmdContract);

   sinon.stub(mocked.object, 'getTotalSupply').callsFake(() => {
      return new Promise((resolve, reject) => {
         let bnInitSupply = new BigNumber(initialSupply);
         hdmdEvents
            .find({})
            .then(found => {
               if (!found[0]) {
                  return new BigNumber(0);
               }
               let total = new BigNumber(0);
               found.forEach(obj => {
                  total = total.plus(obj.netAmount);
               });
               return total;
            })
            .then(bnEventTotal => {
               resolve(bnEventTotal.plus(bnInitSupply));
               return;
            })
            .catch(err => {
               reject(err);
            });
      });
   });

   sinon.stub(mocked.object, 'unmint').callsFake(amount => {
      let eventAmount = amount ? amount.toNumber() : 0;
      return getLastHdmdBlockNumber().then(blockNumber =>
         hdmdEvents.create({
            txnHash: formatter.formatUuidv1(uuidv1()),
            blockNumber: blockNumber + 1,
            amount: typeConverter.numberDecimal(eventAmount),
            netAmount: typeConverter.numberDecimal(eventAmount * -1),
            account: ownerAccount,
            eventName: 'Unmint'
         })
      );
   });

   sinon.stub(mocked.object, 'mint').callsFake(amount => {
      let eventAmount = amount ? amount.toNumber() : 0;
      return getLastHdmdBlockNumber().then(blockNumber =>
         hdmdEvents.create({
            txnHash: formatter.formatUuidv1(uuidv1()),
            blockNumber: blockNumber + 1,
            amount: typeConverter.numberDecimal(eventAmount),
            netAmount: typeConverter.numberDecimal(eventAmount),
            account: ownerAccount,
            eventName: 'Mint'
         })
      );
   });

   sinon.stub(mocked.object, 'batchTransfer').callsFake((addresses, values) => {
      return batchTransferFaker(addresses, values);
   });

   sinon
      .stub(mocked.object, 'reverseBatchTransfer')
      .callsFake((addresses, values) => {
         return batchTransferFaker(addresses, values);
      });

   return { mocked: mocked };
};
