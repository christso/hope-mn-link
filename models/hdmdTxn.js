var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var hdmdTxnSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: mongoose.SchemaTypes.Decimal128,
   account: String,
   sender: String,
   eventName: String
});

module.exports = mongoose.model('HdmdTxn', hdmdTxnSchema);
