var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var reconTxnSchema = new mongoose.Schema({
   reconId: String,
   dmdTxnHash: String,
   hdmdTxnHash: String,
   amount: Number,
   blockNumber: Number
});

module.exports = mongoose.model('ReconTxn', reconTxnSchema);
