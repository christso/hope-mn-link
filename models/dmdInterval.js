var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Schema setup
var dmdIntervalSchema = new mongoose.Schema({
   blockNumber: Number
});

module.exports = mongoose.model('DmdInterval', dmdIntervalSchema);
