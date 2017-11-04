var mongoose = require("mongoose");

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
    date: Date,
    hash: String,
    block: String,
    amount: Number
});

module.exports = mongoose.model("DmdTxn", dmdTxnSchema);