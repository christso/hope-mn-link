var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var reconTxn = new mongoose.Schema({
   hdmd_txnHash: String,
   dmd_txnHash: String,
   hdmdTxn: { type: mongoose.Schema.Types.ObjectId, ref: 'HdmdTxn' },
   dmdTxn: { type: mongoose.Schema.Types.ObjectId, ref: 'DmdTxn' },
   burn: { type: mongoose.Schema.Types.ObjectId, ref: 'Burn' },
   mint: { type: mongoose.Schema.Types.ObjectId, ref: 'Mint' }
});

module.exports = mongoose.model('reconTxn', dmdTxnSchema);
