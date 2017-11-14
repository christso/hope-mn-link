var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var mintSchema = new mongoose.Schema({
   minter: String,
   txnHash: String,
   blockNumber: Number,
   amount: Number,
   blockHash: String,
   dmdAddress: String,
   // dmd_txnHash: String, // reference from HDMD to DMD
   dmdTxn: { type: mongoose.Schema.Types.ObjectId, ref: 'DmdTxn' }
});

module.exports = mongoose.model('Mint', mintSchema);
