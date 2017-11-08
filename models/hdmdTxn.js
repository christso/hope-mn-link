var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// Schema setup
var hdmdTxnSchema = new mongoose.Schema({
    txnHash: String,
    blockNumber: Number,
    amount: Number,
    balance: Number,
    dmd_txnHash: String, // reference from HDMD to DMD
    dmdTxn: {type: mongoose.Schema.Types.ObjectId, ref: 'DmdTxn'}
});

module.exports = mongoose.model("HdmdTxn", hdmdTxnSchema);