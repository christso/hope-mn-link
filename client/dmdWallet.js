// This will interact with the DMD wallet

var bitcoin = require('bitcoin');
var config = require('../config');

host = config.dmdWalletHost;
port = config.dmdWalletPort;
user = config.dmdWalletUser;
pass = config.dmdWalletPass;

var client = new bitcoin.Client({
    host: host,
    port: port,
    user: user,
    pass: pass
});

// params = ["dQmpKBcneq1ZF27iuJsUm8dQ2QkUriKWy3", 0.1, "donation", "seans outpost"]

module.exports = {
    /* callback can return
    
    { Error: Insufficient funds }

    */
    sendToAddress(dmdAddress, value, callback) {
        client.sendToAddress(dmdAddress, value, callback);
    }
}