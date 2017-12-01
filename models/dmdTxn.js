var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
   txnHash: String,
   blockNumber: Number,
   amount: mongoose.SchemaTypes.Decimal128,
   balance: mongoose.SchemaTypes.Decimal128
});

module.exports = mongoose.model('DmdTxn', dmdTxnSchema);
