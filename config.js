var config = {};

config.port = 8080;

// change the address on deployment
// NOTE: If you get an error connecting, review https://github.com/Automattic/mongoose/issues/5399
config.mongodbUri = 'mongodb://localhost:27017/hdmdlink';
config.mongodbUriTest = 'mongodb://localhost:27017/hdmdlinktest';

config.ethNodeAddress = 'http://localhost:8545';

// config.hdmdContractAddress = '0x6b0a9eaf59baf7e5f6908052093584aa666bf565'; // christso testRPC
config.hdmdContractAddress = '0x6106fe192eF1BF153b738A595DeA473e90b3A015'; // rinkeby

config.hdmdDecimals = 8;

config.hdmdVersion = 0.18; // version of HDMD Smart Contract

config.ethGasLimit = 3000000;

config.cryptoidDmdUri =
   'https://chainz.cryptoid.info/explorer/address.summary.dws?coin=dmd&id=12829&r=25294&fmt.js';

config.apiUri = `http://localhost:${config.port}`;

config.dmdWalletHost = '127.0.0.1';
config.dmdWalletPort = 17772;
config.dmdWalletUser = 'testuser';
config.dmdWalletPass = 'hope2017';

//config.dmdWatchInterval = 3600000; // 1 hour
config.dmdWatchInterval = 15000; // 15 seconds
//config.dmdWatchInterval = 5000; // 5 seconds

config.requireDbSeed = true; // WARNING: Ensure this is false unless you're seeding the contract
config.requireContractSeed = true; // WARNING: Ensure this is false unless you're seeding the contract
config.syncAfterSeed = true;
config.activated = false; // set to false to disable seeding and syncing

config.allowThisMinter = true; // force allow this node to mint
config.saveInitialSupply = true; // save the difference in total supply to agree MongoDB to HDMD blockchain

config.relativeBalanceChangeTolerance = 0.0001;

module.exports = config;
