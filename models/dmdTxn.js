var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: Number,
   balance: Number
});

module.exports = mongoose.model('DmdTxn', dmdTxnSchema);
