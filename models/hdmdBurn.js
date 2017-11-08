var mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// Schema setup
var hdmdBurnSchema = new mongoose.Schema({
    burner: String,
    txnHash: String,
    blockNumber: Number,
    amount: Number,
    blockHash: String,
    dmdAddress: String,
    // dmd_txnHash: String, // reference from HDMD to DMD
    dmdTxn: { type: mongoose.Schema.Types.ObjectId, ref: 'DmdTxn' }
});

module.exports = mongoose.model("hdmdBurn", hdmdBurnSchema);