# Task List

## Boilerplate

- [x] Create web3 event listener on HDMD.
- [ ] Store event log in MongoDB. Each event in HDMD will be a document. Each event in DMD will be another document. We need to link both documents and use the database to provide a reconciliation of both blockchains. The documents must store txnId.
- [x] Create RESTful API using Express so that we can call different functions via the web browser.

## Mint

- [ ] When the DMD wallet receives a staking reward, invoke mint(reward) on HDMD.

## Burn

- [ ] When a burn event is fired on HDMD blockchain, send DMD tokens to the address that wants to receive them.
- [ ] Update MongoDB to reflect the decreased supply of DMD in the masternode, and HDMDs.

## Reporting

- [ ] List account balances of HDMD token holders.

## Questions

- [ ] Do we need to send commands to DMD desktop wallet in order to send DMDs or will this be manual?

# Troubleshooting

### new BigNumber() not a base 16 number

* Cause: The contract probably doesn't exist at the address.
* Solution: Correct the address. You probably just need to uncomment the current address, and change the address for testRPC since another developer would use a different address.