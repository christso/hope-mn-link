# Task List

## Boilerplate

- [x] Create web3 event listener on HDMD.
- [ ] Store event log in MongoDB. Each event in HDMD will be a document. Each event in DMD will be another document. We need to link both documents and use the database to provide a reconciliation of both blockchains. The documents must store txnId.
- [x] Create RESTful API using Express so that we can call different functions via the web browser.

## Mint

- [ ] Watch for changes in DMD wallet on [cryptoID](https://chainz.cryptoid.info/dmd/address.dws?dH4bKCoyNj9BzLuyU4JvhwvhYs7cnogDVb.htm).
- [ ] When the DMD wallet receives a staking reward, invoke mint(reward) on HDMD.

## Burn

- [ ] When a burn event is fired on HDMD blockchain, send DMD tokens to the address that wants to receive them.
- [ ] Update MongoDB to reflect the decreased supply of DMD in the masternode, and HDMDs.

## Reporting

- [ ] List account balances of HDMD token holders.

# Getting Started

Start an ethereum node with ```testrpc``` or ```geth``` which listens on ```localhost:8585```.

In this project, run the CLI commands below:
```
npm install

cd "C:\Program Files\MongoDB\Server\3.4\bin\"
mongod.exe

npm start
```

# Troubleshooting

### new BigNumber() not a base 16 number

* Cause: The contract probably doesn't exist at the address.
* Solution: Correct the address. You probably just need to uncomment the current address, and change the address for testRPC since another developer would use a different address.

### Node app is frozen

* Cause: testRPC or geth process is locked. This occassionally occurs on Windows 10.
* Solution: You'll need to press any key in the console to unlock it.