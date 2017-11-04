var mongoose = require("mongoose");

// Schema setup
var dmdTxnSchema = new mongoose.Schema({
    hash: String,
    block: String,
    amount: Number
});

module.exports = mongoose.model("DmdTxn", dmdTxnSchema);