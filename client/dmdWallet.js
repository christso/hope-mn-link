// This will interact with the DMD wallet

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
    host: '127.0.0.1',
    //port: 51473,
    port: 17772,
    user: 'testuser',
    pass: 'hope2017'
});

client.getDifficulty(function (err, difficulty) {
    if (err) {
        return console.error(err);
    }

    console.log('Difficulty: ' + difficulty);
});

client.getBalance('*', 6, function (err, balance) {
    if (err) return console.log(err);
    console.log('Balance:', balance);
});

// params = ["dQmpKBcneq1ZF27iuJsUm8dQ2QkUriKWy3", 0.1, "donation", "seans outpost"]
client.sendToAddress('dQmpKBcneq1ZF27iuJsUm8dQ2QkUriKWy3', 0.1, function (err, difficulty) {
    if (err) {
        return console.error(err);
    }

    console.log('Sent: ' + difficulty);
});
