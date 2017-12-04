var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var dmdIntervalSchema = new mongoose.Schema({
   blockNumber: Number,
   account: String,
   sender: String,
   sendToAddress: String, // used by Burn() and Transfer()
   eventName: String
});

module.exports = mongoose.model('DmdInterval', dmdIntervalSchema);
