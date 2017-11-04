var mongoose = require("mongoose");

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
    txnHash: String,
    blockNumber: Number,
    amount: Number,
    balance: Number,
    hdmd_txnHash: String // reference from DMD to HDMD
});

module.exports = mongoose.model("DmdTxn", dmdTxnSchema);