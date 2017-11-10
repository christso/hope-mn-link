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
    /* callback(error) can return
    { Error: Insufficient funds }

    use callback(error, response)
    */
    sendToAddress(dmdAddress, value) {
        return new Promise(function(resolve, reject) {
            client.sendToAddress(dmdAddress, value, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            }); 
        });
    }
}