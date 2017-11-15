var config = {};

config.port = 8080;

config.mongodbUri = 'mongodb://localhost:27017/hdmdlink';

config.ethNodeAddress = 'http://localhost:8545';

config.hdmdContractAddress = '0xde4a8326a6afaf0ac0f66467e74bb7cfed2ba206'; // christso testRPC
//config.hdmdContractAddress = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

config.hdmdDecimals = 8;

config.hdmdVersion = 0.16; // version of HDMD Smart Contract

config.ethGasLimit = 300000;

config.cryptoidDmdUri =
   'https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js';

config.apiUri = `http://localhost:${config.port}`;

config.dmdWalletHost = '127.0.0.1';
config.dmdWalletPort = 17772;
config.dmdWalletUser = 'testuser';
config.dmdWalletPass = 'hope2017';

//config.dmdWatchInterval = 3600000; // 1 hour
//config.dmdWatchInterval = 15000; // 15 seconds
config.dmdWatchInterval = 5000; // 5 seconds

module.exports = config;
