const Web3 = require('web3');
const abi = require('../client/hdmdABI')();
const config = require('../config');
var hdmdTxns = require('../models/hdmdTxn');
var hdmdBurn = require('../models/hdmdBurn');

const hdmdVersion = config.hdmdVersion;
const ethNodeAddress = config.ethNodeAddress;

var contractLocation = config.hdmdContractAddress;

// set the Web3 to where we need to connect
var web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));

// set default account to use as msg.sender to contract
// this account will need to be added via allowMinter to be able to invoke mint()
web3.eth.defaultAccount = web3.eth.coinbase;
var defaultAccount = web3.eth.defaultAccount;

// Set up a contract with interface
var contract = web3.eth.contract(abi);
// Instantiate contact so we can interact
var hdmdContract = contract.at(contractLocation);

var req1 = {
   addresses: [
      '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
      '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
      '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
      '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
      '0x3b6b857a829fb942A29622da2914776Da35E9611',
      '0x5620040ed2e9B41cC90428d0B8bF4feDf8391beD',
      '0xC27D7bD12e09289E33bB2806C6AA41f9AEE77cd8',
      '0xABF590118A7eF2935D51E0eF4044Dc8a8499B129',
      '0x1e4b1A05e44F6ed64169ACF1EF3b187Fe57d7e9B',
      '0x978d5AA0A4a67e139AF6BE9505b98374c1F385e2',
      '0x9ae80955AC7052ebD23E41923130f2DE6e42aCAc',
      '0x4EBd2f3a835600Ee3c7F55DC9D559FC0b81BAc93',
      '0x513BB30C87d9Ccf09caB719F7568494Ab9696aC8',
      '0x412e2115bB4b01AdB68fc9a7A326d3BCd84aB8f0',
      '0x96bEaCffE3840a90D66c05b3daCb8473BE7DB697',
      '0x418c5a25431be9b796AC621D9a1B9Ec242e72Bc1',
      '0x6a7d3F84Ba54AcbD00ce3e2f5EF33A93b6EA50CF',
      '0xf4214A6ff65bd0301714a62d3197EC723f83Ba0a',
      '0x934B820aCFF9274B99d857a3e1cEcE97bcC803b8',
      '0x6E15731De69f85bD1eDD4308eD6AF3C72292a387'
   ],
   values: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

var req2 = {
   addresses: [
      '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
      '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1'
   ],
   values: [1, 1]
};

// Batch Transfer

(function() {
   var req = req1;
   let addresses = req.addresses;
   let values = req.values;
   hdmdContract.batchTransfer(
      addresses,
      values,
      // {from: defaultAccount, gas: "300000"},
      function(err, result) {
         if (err) {
            console.log('Batch Transfer Failed: ', err);
         } else {
            console.log('Batch Transfer Passed', result);
         }
      }
   );
})();

// Transfer
(function() {
   let address = '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3';
   let value = 1;
   hdmdContract.transfer(address, value, function(err, result) {
      if (err) {
         console.log('Transfer Failed: ', err);
      } else {
         console.log('Transfer Passed', result);
      }
   });
})();

// Mint

// apportion(newTransaction.amount, defaultAccount)
// .then(res => console.log('Apportioned tokens with Batch Transfer', res))
// .catch(err => console.log('Unable to apportion tokens', err));

// wallet.sendToAddress(newTransaction.dmdAddress, newTransaction.amount)
// .then(result => console.log(result))
// .catch(err => console.log(err));