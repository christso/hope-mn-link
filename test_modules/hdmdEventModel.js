var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Fake eth event log
var hdmdEventSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: mongoose.SchemaTypes.Decimal128,
   netAmount: mongoose.SchemaTypes.Decimal128,
   account: String,
   sendToAddress: String,
   eventName: String
});
module.exports = mongoose.model('HdmdEvent', hdmdEventSchema);
