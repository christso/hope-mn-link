# Getting Started

Start an ethereum node with ```testrpc``` or ```geth --rpc``` which listens on ```localhost:8585```.

In HDMDLink project, run the CLI commands below:
```
truffle compile
truffle migrate
truffle console
```

In truffle, run this to allow the default account to invoke `mint()`.
```
HDMDToken.deployed().then(function(instance){hdmd=instance});
hdmd.allowMinter(web3.eth.accounts[0]);
```

Then run this to get the contract address:
```
hdmd.address;
```

In this project, change the `hdmdContractAddress` in `config.js`.

Then run the CLI commands below:

```
npm install

cd "C:\Program Files\MongoDB\Server\3.4\bin\"
mongod.exe

npm start
```
You can interact with the API using curl (for Linux) or Postman (for Windows). Ensure that you select `JSON (application/json)` as the body format.

![Postman](https://i.imgur.com/pbCjsUK.png)

# Unit Testing

We use Jest as our unit-testing framework. To install, run the CLI command:
```
npm install -g --save-dev jest
```

# Troubleshooting

### new BigNumber() not a base 16 number

* Cause: The contract probably doesn't exist at the address.
* Solution: Correct the address. You probably just need to uncomment the current address, and change the address for testRPC since another developer would use a different address.

### Node app is frozen

* Cause: testRPC or geth process is locked. This occassionally occurs on Windows 10.
* Solution: You'll need to press any key in the Powershell console to unlock it. Alternatively, use CMD or VS Code Integrated Terminal.

### Error when Minting

```
Error: invalid address
    at inputAddressFormatter (drive:\HDMDLink\node_modules\web3\lib\web3\formatters.js:273:11)
```
* Cause: The address of the wallet is not authorized to mint.
* Solution: Invoke the allowMinter function in truffle or other client where you are the contract owner, and pass the address of web3.eth.defaultAccount as a parameter. After that, the address should be allowed to invoke the mint function.

### MongoDB query returns empty result

* Cause: Object names are case-sensitive in MongoDB, but the Moongoose package changes your collection names to lowercase.
* Solution: Check your casing.