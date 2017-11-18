var config = {};

config.port = 8080;

// change the address on deployment
// NOTE: If you get an error connecting, review https://github.com/Automattic/mongoose/issues/5399
config.mongodbUri = 'mongodb://localhost:27017/hdmdlink';

config.ethNodeAddress = 'http://localhost:8545';

config.hdmdContractAddress = '0x0b13c66d5f527c74a6bd8fdf87b3f2bc28038093'; // christso testRPC
//config.hdmdContractAddress = '0x5b45cb92A968329A83Cd3f2FBFB1bF206043d70C'; // rinkeby

config.hdmdDecimals = 8;

config.hdmdVersion = 0.17; // version of HDMD Smart Contract

config.ethGasLimit = 3000000;

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

config.requireSeed = false; // WARNING: Ensure this is false unless you're seeding the contract
config.allowThisMinter = true; // force allow this node to mint
config.saveInitialSupply = true; // save the difference in total supply to agree MongoDB to HDMD blockchain

module.exports = config;
