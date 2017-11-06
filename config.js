var config = {};

config.port = 8080;

config.mongodbUri = 'mongodb://localhost:27017/hdmdlink';

config.ethNodeAddress = 'http://localhost:8545';

config.hdmdContractLocation = '0x7959205b5ef308b07934266bf0db52f8dc43265f'; // christso testRPC
//config.hdmdContractLocation = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

config.hdmdVersion = 0.13; // version of HDMD Smart Contract

config.cryptoidDmdUri = 'https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js';

config.apiUri = `http://localhost:${config.port}`;

module.exports = config;