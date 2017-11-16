var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var hdmdTxnSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: Number,
   account: String,
   sender: String,
   eventName: String
});

module.exports = mongoose.model('HdmdTxn', hdmdTxnSchema);
