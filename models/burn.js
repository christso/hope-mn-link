var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var burnSchema = new mongoose.Schema({
   txnHash: String,
   amount: mongoose.SchemaTypes.Decimal128,
   sendToAddress: String,
   status: String
});

module.exports = mongoose.model('Burn', burnSchema);
