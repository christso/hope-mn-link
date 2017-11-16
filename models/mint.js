var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var mintSchema = new mongoose.Schema({
   txnHash: String,
   amount: Number
});

module.exports = mongoose.model('Mint', mintSchema);
