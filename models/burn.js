var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var burnSchema = new mongoose.Schema({
   timestamp: mongoose.SchemaTypes.Date,
   dmdTxnHash: String,
   hdmdTxnHash: String,
   amount: mongoose.SchemaTypes.Decimal128,
   account: String,
   sendToAddress: String,
   status: String,
   response: String
});

module.exports = mongoose.model('Burn', burnSchema);
