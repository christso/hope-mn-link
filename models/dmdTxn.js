var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
    txnHash: String,
    blockNumber: Number,
    amount: Number,
    balance: Number,
    hdmd_txnHash: String, // reference from DMD to HDMD
    hdmdTxn: {type: mongoose.Schema.Types.ObjectId, ref: 'HdmdTxn'}
});

module.exports = mongoose.model("DmdTxn", dmdTxnSchema);