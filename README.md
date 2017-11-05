# Getting Started

Start an ethereum node with ```testrpc``` or ```geth``` which listens on ```localhost:8585```.

In this project, run the CLI commands below:
```
npm install

cd "C:\Program Files\MongoDB\Server\3.4\bin\"
mongod.exe

npm start
```

You can interact with the API using curl (for Linux) or Postman (for Windows). Ensure that you select "JSON (application/json) as the body format, otherwise the request body in Express will be empty.

![Postman](https://i.imgur.com/pbCjsUK.png)

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