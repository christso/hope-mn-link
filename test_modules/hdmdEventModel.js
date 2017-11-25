var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Fake eth event log
var hdmdEventSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: Number,
   netAmount: Number,
   account: String,
   eventName: String
});
module.exports = mongoose.model('HdmdEvent', hdmdEventSchema);
