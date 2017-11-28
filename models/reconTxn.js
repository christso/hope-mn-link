var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var reconTxnSchema = new mongoose.Schema({
   reconId: String,
   dmdTxnHash: String,
   hdmdTxnHash: String,
   amount: mongoose.SchemaTypes.Decimal128,
   account: String,
   blockNumber: Number,
   eventName: String,
   dmdFlag: mongoose.SchemaTypes.Boolean,
   hdmdFlag: mongoose.SchemaTypes.Boolean
});

module.exports = mongoose.model('ReconTxn', reconTxnSchema);
