var mongoose = require("mongoose");

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
    hash: String,
    block: Number,
    amount: Number,
    balance: Number
});

module.exports = mongoose.model("DmdTxn", dmdTxnSchema);