var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// Schema setup
var hdmdTxnSchema = new mongoose.Schema({
    txnHash: String,
    blockNumber: Number,
    amount: Number,
    balance: Number,
    dmd_txnHash: String, // reference from HDMD to DMD
});

module.exports = mongoose.model("HdmdTxn", hdmdTxnSchema);