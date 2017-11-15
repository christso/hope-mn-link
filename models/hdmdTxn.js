var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var hdmdTxnSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: Number,
   balance: Number,
   eventName: String
});

module.exports = mongoose.model('HdmdTxn', hdmdTxnSchema);
