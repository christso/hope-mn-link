var config = {};

config.port = 8080;

config.mongodbUri = 'mongodb://localhost:27017/hdmdlink';

config.ethNodeAddress = 'http://localhost:8545';

config.hdmdContractLocation = '0xa50f04e8bf5d0333198f364a91ae23aee4134cce'; // christso testRPC
//config.hdmdContractLocation = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

config.hdmdDecimals = 8;

config.hdmdVersion = 0.15; // version of HDMD Smart Contract

config.ethGasLimit = 300000;

config.cryptoidDmdUri = 'https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js';

config.apiUri = `http://localhost:${config.port}`;

config.dmdWalletHost = '127.0.0.1';
config.dmdWalletPort = 17772;
config.dmdWalletUser = 'testuser';
config.dmdWalletPass = 'hope2017';

module.exports = config;