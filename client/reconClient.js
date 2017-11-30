// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');
var BigNumber = require('bignumber.js');
const uuidv4 = require('uuid/v4');
var Logger = require('../lib/logger');
var logger = new Logger('RECON');
var mongodb = require('mongodb');
var typeConverter = require('../lib/typeConverter');
var toBigNumber = typeConverter.toBigNumber;

var port = config.port;

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

var reconTxns = require('../models/reconTxn');

const nothingToMint = 'nothing-to-mint';
const formatter = require('../lib/formatter');
var queries = require('../client/databaseQueries');

// Constructor
function init(newDmdClient, newHdmdClient) {
   let assign = () => {
      return new Promise(resolve => {
         if (newDmdClient) {
            dmdClient = newDmdClient;
         }
         if (newHdmdClient) {
            hdmdClient = newHdmdClient;
         }
         resolve();
      });
   };

   return assign();
}
init();

function downloadDmdTxns() {
   return dmdClient
      .downloadTxns()
      .then(result => {
         if (result) {
            logger.log(
               `Downloaded ${result.length} DMD Transactions from CryptoID:\n`
            );
         } else {
            logger.log(
               'Downloaded DMD Transactions from CryptoID: No changes found'
            );
         }
      })
      .catch(err => {
         logger.log(
            'Error downloading from DMD CryptoID and saving to DB',
            err
         );
         return Promise.reject(err);
      });
}

function downloadHdmdTxns() {
   return hdmdClient
      .downloadTxns()
      .then(result => {
         if (result) {
            logger.log(
               `Downloaded ${
                  result.length
               } HDMD Transactions from Ethereum network`
            );
         } else {
            logger.log(
               'Downloaded HDMD Transactions from Ethereum network - no changes found'
            );
         }
      })
      .catch(err => {
         logger.log(
            'Error downloading HDMD Transactions from Ethereum network and saving to DB',
            err
         );
         return Promise.reject(err);
      });
}

/**
 * Get amount that needs to be minted
 * @param {<DmdTxn>[]} dmds - DMD transactions that needs to be matched
 * @param {<HdmdTxn>[]} hdmds - HDMD transactions that needs to be matched
 * @return {<BigNumber>} amount that needs to be minted
 */
function getRequiredMintingAmount(dmds, hdmds) {
   dmdTotal = new BigNumber(0);
   dmds.forEach(txn => {
      dmdTotal = dmdTotal.plus(toBigNumber(txn.amount));
   });

   hdmdTotal = new BigNumber(0);
   hdmds.forEach(txn => {
      hdmdTotal = hdmdTotal.plus(toBigNumber(txn.amount));
   });

   return dmdTotal.minus(hdmdTotal);
}

function validateRecon(dmds, hdmds) {
   if (dmds === undefined || hdmds === undefined) {
      return Promise.reject(`parameters dmds and hdmds cannot be undefined`);
   }

   // calculate values
   let dmdSum = dmds.map(doc => {
      return typeConverter.toBigNumber(doc.amount);
   });
   if (dmdSum.length > 0) {
      dmdSum = dmdSum.reduce((a, b) => {
         return a.plus(b);
      });
   }

   let hdmdSum = hdmds.map(doc => {
      return typeConverter.toBigNumber(doc.amount);
   });
   if (hdmdSum.length > 0) {
      hdmdSum = hdmdSum.reduce((a, b) => {
         return a.plus(b);
      });
   }

   // log result
   logger.log(
      `
      [RECON] Validating before reconciliation. Totals for DMD = ${
         dmdSum
      }, HDMD = ${hdmdSum}. Count for DMD = ${dmds.length}, HDMD = ${
         hdmds.length
      }.
      `
   );
   logger.debug(`DMD Objects = ${JSON.stringify(dmds)}
      HDMD Objects = ${JSON.stringify(hdmds)}
      `);

   // return
   if (
      (dmdSum.length === 0 && hdmdSum.length === 0) ||
      (dmdSum.length === 0 && hdmdSum.equals(0)) ||
      (hdmdSum.length === 0 && dmdSum.equals(0)) ||
      dmdSum.equals(hdmdSum)
   ) {
      return Promise.resolve(true);
   }
   return Promise.reject(
      new Error(
         `[RECON] DMD Total was ${
            dmdSum
         }, but expected to equal HDMD Total of ${hdmdSum}`
      )
   );
}

function unsafeReconcile(dmds, hdmds) {
   let reconId = formatter.formatUuidv1(uuidv4());
   let newDate = new Date();
   let dmdRecs = dmds.map(txn => {
      return {
         timestamp: newDate,
         reconId: reconId,
         dmdTxnHash: txn.txnHash,
         hdmdTxnHash: null,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber,
         dmdFlag: true,
         hdmdFlag: false
      };
   });
   let hdmdRecs = hdmds.map(txn => {
      return {
         timestamp: newDate,
         reconId: reconId,
         dmdTxnHash: null,
         hdmdTxnHash: txn.txnHash,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber,
         eventName: txn.eventName,
         dmdFlag: false,
         hdmdFlag: true
      };
   });
   let recs = dmdRecs;
   recs.push(...hdmdRecs);
   return reconTxns.create(recs).then(docs => {
      if (docs) {
         logger.log(`[RECON] Reconciled ${docs.length} transactions`);
      } else {
         logger.log(`[RECON] No transactions needed to be reconciled`);
      }
   });
}

/**
 * Reconcile HDMDs with DMDs in ReconTxns MongoDB collection
 * @param {Object[]} dmds - DMD transactions to be reconciled
 * @param {Object[]} hdmds - HDMD transactions to be reconciled
 * @return {Promise.<ReconTxns[]>} result of the promise
 */
function reconcile(dmds, hdmds) {
   return validateRecon(dmds, hdmds)
      .then(() => {
         return unsafeReconcile(dmds, hdmds);
      })
      .catch(err => {
         return Promise.reject(err);
      });
}

/**
 * Invoke mint on HDMD smart contract and reconcile with DMDs
 * @param {<Dmd>[]} dmds - DMD transactions to be matched
 * @param {<Hdmd>[]} hdmds - HDMD transactions to be matched
 * @return {Promise.<{txnHash: string, amount: <BigNumber>}>} result of the promise
 */
function mintToDmd(dmds, hdmds) {
   return new Promise((resolve, reject) => {
      let amount = getRequiredMintingAmount(dmds, hdmds);
      let txnHashResolved = Promise.resolve();
      if (amount.gt(0)) {
         txnHashResolved = hdmdClient
            .mint(amount)
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount,
                  netAmount: amount,
                  eventName: 'Mint'
               };
               logger.log(`Mint invoked: ${JSON.stringify(mintTxn)}`);
               return mintTxn;
            })
            .catch(err => {
               return Promise.reject(`Error invoking mint: ${err}`);
            });
      } else if (amount.lt(0)) {
         txnHashResolved = hdmdClient
            .unmint(amount.times(-1))
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount.mul(-1),
                  netAmount: amount,
                  eventName: 'Unmint'
               };
               logger.log(`Unmint invoked: ${JSON.stringify(mintTxn)}`);
               return mintTxn;
            })
            .catch(err => {
               return Promise.reject(`Error invoking unmint: ${err}`);
            });
      } else {
         txnHashResolved = Promise.resolve(nothingToMint);
      }
      resolve(txnHashResolved);
   });
}

function getLastDmdRecon() {
   if (dmdBlockNumber) {
      // Get the reconTxn for the *DMD block number*
      return reconTxns
         .find({ dmdTxnHash: { $ne: null }, blockNumber: dmdBlockNumber })
         .limit(1)
         .then(res => {
            return res[0] ? res[0].reconId : undefined;
         });
   }
   // Get the reconTxn for the *latest DMD block*
   return reconTxns
      .find({ dmdTxnHash: { $ne: null } })
      .sort({ blockNumber: -1 })
      .limit(1)
      .then(res => {
         return res[0] ? res[0].reconId : undefined;
      });
}

/**
 * Get the latest reconTxn for HDMD
 * @param {Number} dmdBlockNumber - the DMD block number that has been reconciled. If this is undefined, then it will default to the latest block
 * @return {Promise} - the last reconTxn for HDMD for the reconId associated with the DMD block number
 */
function getLastHdmdRecon(dmdBlockNumber) {
   return new Promise((resolve, reject) => {
      let p = getLastDmdRecon(dmdBlockNumber);
      getLastDmdRecon(dmdBlockNumber)
         .then(reconId =>
            reconTxns
               .find({
                  hdmdTxnHash: { $ne: null },
                  reconId: reconId
               })
               .sort({ blockNumber: -1 })
               .limit(1)
         )
         .then(obj => resolve(...obj))
         .catch(err => reject(err));
   });
}

/**
 * Download transactions to MongoDB
 * @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
 */
function downloadTxns() {
   return Promise.all([
      downloadDmdTxns().catch(err => {
         return Promise.reject(new Error('Error downloading DMDs: ' + err));
      }),
      downloadHdmdTxns()
   ]).then(() => logger.log('Download of DMD and HDMD txns completed.'));
}

/**
 * Retrieve unmatched transactions from MongoDB up to the previous block
 * @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
 */
function getBeginUnmatchedTxns(dmdBlockNumber) {
   let prevOffset = 1;
   let prevDmdBlockNumber = dmdBlockNumber
      ? dmdBlockNumber - prevOffset
      : undefined;

   return getUnmatchedTxns(prevDmdBlockNumber);
}

/**
 * Retrieve unmatched transactions from MongoDB
 * @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
 */
function getUnmatchedTxns(dmdBlockNumber) {
   let getUnmatchedDmds = dmdClient.getUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   return Promise.all([getUnmatchedDmds(dmdBlockNumber), getUnmatchedHdmds()]);
}

/**
 * distribute the minted amount to entitled recipients
 * @param {<BigNumber>} amount
 * @param {{_id: string, totalAmount: <BigNumber>}[]} balances
 * @returns {Promise}
 */
function distributeMint(amount, balances) {
   if (!balances) {
      return Promise.reject(new Error(`Balances cannot be undefined`));
   }
   let recipients = balances.map(b => b._id);
   let weights = balances.map(b => {
      return b.balance;
   });
   let bnAmount = amount instanceof BigNumber ? amount : toBigNumber(amount);

   return hdmdClient.apportion(bnAmount, recipients, weights).catch(err => {
      return Promise.reject(
         new Error(`Error apportioning minted amount: ${err.stack}`)
      );
   });
}

/**
 If the dmdBlockNum is greater than the most recent DMD block number in recon txn, then it will be the most recent HDMD block number.
 * @param {Number} dmdBlockNum - DMD block number associated with the recon txn
 * @param {Number} dmdBackSteps - number of HDMD block numbers to look back.
 */
function getHdmdBlockNumFromDmd(dmdBlockNum, dmdBackSteps, HdmdBackSteps) {
   let getDmdIntersects = queries.recon.getDmdIntersects;

   var p = Promise.resolve();
   var matchedDmdBlockNum;

   if (dmdBackSteps === undefined) {
      dmdBackSteps = 0;
   }
   if (HdmdBackSteps === undefined) {
      HdmdBackSteps = 0;
   }

   // Compute Balances
   // get the latest block number that was reconciled (up to backsteps ago)
   return getDmdIntersects().then(recons => {
      let filtered;
      if (dmdBlockNum === undefined || dmdBlockNum === null) {
         filtered = recons;
      } else {
         filtered = recons[0]
            ? recons.filter(r => {
                 return r.dmdBlockNumber <= dmdBlockNum;
              })
            : null;
      }

      let hdmdBlockNum = filtered[dmdBackSteps]
         ? filtered[dmdBackSteps].hdmdBlockNumber
         : null;
      return hdmdBlockNum;
   });
}

/**
 * Gets HDMD account balances at the specified DMD blockNumber
 * @param {number} blockNumber - DMD blockNumber to get the balance for
 * @return {{addresses: string[], balances: number[]}}  - { addresses[], balances[] }
 */
function getBeginHdmdBalancesFromDmd(dmdBlockNum, backsteps) {
   let getBeginHdmdBalancesFromBlock =
      queries.recon.getBeginHdmdBalancesFromBlock;

   return getHdmdBlockNumFromDmd(dmdBlockNum, backsteps)
      .then(hdmdBlockNum => {
         return getBeginHdmdBalancesFromBlock(hdmdBlockNum);
      })
      .then(hdmdBals => {
         return hdmdBals;
      });
}

function didRelativeBalancesChange(dmdBlockNum, tolerance) {
   if (tolerance === undefined) {
      tolerance = 0.001;
   }

   let getRelativeBalances = (dmdBlockNum, backsteps) => {
      return getBeginHdmdBalancesFromDmd(dmdBlockNum, backsteps).then(bals => {
         if (bals.length === 0) {
            return [];
         }
         // convert balances
         let bnBals = bals.map(bal => {
            return {
               account: bal.account,
               balance: new BigNumber(bal.balance.toString())
            };
         });
         return convertToRelativeBalances(bnBals);
      });
   };

   return Promise.all([
      getRelativeBalances(dmdBlockNum, 0),
      getRelativeBalances(dmdBlockNum, 1)
   ]).then(([curBals, prevBals]) => {
      let compared = compareBalances(curBals, prevBals);
      // Return true if maxDiff rounded to decimals is non-zero
      let maxDiff = compared.maxDiff;
      let diffs = compared.diffs;

      // NOTE: to debug --> diffs.map(b => { return { account: b.account, balance1: b.balance1.toNumber(), balance2: b.balance2.toNumber(), diff: b.diff.toNumber() } })
      if (maxDiff.absoluteValue().greaterThan(tolerance)) {
         return true;
      }
      return false;
   });
}

/**
 * @returns {({account: string, balance: <BigNumber>})}
 * @param {({account: string, balance: <BigNumber>})[]} balances
 * @param {Number} decimals
 */
function convertToRelativeBalances(balances) {
   if (balances[0] === undefined) {
      return [];
   }

   let totalBalance = new BigNumber(0);
   balances.forEach(b => {
      return (totalBalance = totalBalance.plus(b.balance));
   });

   let relativeBalances = balances.map(b => {
      return { account: b.account, balance: b.balance.div(totalBalance) };
   });

   return relativeBalances;
}

/**
 * @typedef {({account: string, balance: <BigNumber>})[]} BnHdmdBalances
 * @param {({account: string, balance: <BigNumber>})[]} balances1 - HDMD balances to compare with balances2
 * @param {({account: string, balance: <BigNumber>})[]} balances2 - HDMD balances to compare with balances1
 * @param {Number} decimals - precision in decimals
 * @returns {({maxDiff: {BigNumber}, diffs: {BnHdmdBalances}})} 0 if no difference, 1 if different
 */
function compareBalances(balances1, balances2) {
   let diffs = [];
   let maxDiff = new BigNumber(0);

   for (var i = 0; i < balances1.length; i++) {
      // Get the balances1 with the same account as balances2
      let b2sFiltered = balances2.filter(b2 => {
         return b2.account === balances1[i].account;
      });
      let diff = balances1[i].balance.minus(
         b2sFiltered[0] ? b2sFiltered[0].balance : new BigNumber(0)
      );
      diffs.push({
         account: balances1[i].account,
         balance1: balances1[i] ? balances1[i].balance : new BigNumber(0),
         balance2: b2sFiltered[0] ? b2sFiltered[0].balance : new BigNumber(0),
         diff: diff
      });
      if (diff.absoluteValue().greaterThan(maxDiff.absoluteValue())) {
         maxDiff = diff;
      }
   }

   return {
      maxDiff: maxDiff,
      diffs: diffs
   };
}

/**
Finds unmatched dmdTxns and hdmdTxns in MongoDB
then invokes mint and unmint on HDMD eth smart contract
Mint HDMDs up to dmdBlockNumber to make HDMD balance equal to DMD balance
* @return {Promise} - returns an empty promise if resolved
*/
function synchronizeNext(dmdBlockNumber) {
   let minted;
   let dmds;
   let hdmds;
   let balancesResult;

   logger.log(`Synchronizing up to DMD Block ${dmdBlockNumber}`);
   return (
      getBeginUnmatchedTxns(dmdBlockNumber)
         .then(values => {
            dmds = values[0];
            hdmds = values[1];
            return mintToDmd(dmds, hdmds); // mint the amount that DMD is higher than HDMD
         })
         .then(value => {
            minted = value;
            // download eth event log
            return downloadHdmdTxns();
         })
         // reconcile hdmdTxns MongoDB to dmdTxns MongoDB
         .then(saved => {
            // dmds.amount == hdmds.amount in all cases because mint is done before the reconcile
            if (minted === nothingToMint) {
               return reconcile(dmds, hdmds);
            } else {
               // what we do if a mint has occured
               return getBeginUnmatchedTxns(dmdBlockNumber)
                  .then(values => {
                     dmds = values[0];
                     hdmds = values[1];
                     return reconcile(dmds, hdmds);
                  }) // get balance that was reconciled
                  .then(() => {
                     return getBeginHdmdBalancesFromDmd(dmdBlockNumber, 0);
                  })
                  .then(balances => {
                     balancesResult = balances.map(bal => {
                        var newBal = {};
                        Object.assign(newBal, bal);
                        newBal.balance = typeConverter.toBigNumber(bal.balance);
                        if (newBal.balance.lessThan(0)) {
                           let acc = newBal.account;
                           let bal = newBal.balance;
                           throw new Error(
                              `Balance of account '${acc}' is ${
                                 bal
                              } which is negative and not allowed`
                           );
                        }
                        return newBal;
                     });
                     if (balancesResult.length != 0) {
                        return distributeMint(minted.netAmount, balancesResult);
                     }
                  });
            }
         })
         .then(() => {
            return {
               balances: balancesResult
            };
         })
   );
}

function synchronizeAll() {
   let getUnmatchedDmdBlockIntervals =
      queries.recon.getUnmatchedDmdBlockIntervals;

   return getUnmatchedDmdBlockIntervals().then(dmdBlockNumbers => {
      let p = Promise.resolve();
      dmdBlockNumbers.push(null); // null or undefined means there's no next blocknumber to be used in the filter
      dmdBlockNumbers.push(null); // push again so it gets the updated hdmd and dmds
      dmdBlockNumbers.push(null); // push again so it gets the updated hdmd and dmds
      dmdBlockNumbers.forEach(dmdBlockNumber => {
         //logger.log(`Set synchronization dmdBlockNumber = ${dmdBlockNumber}`);
         p = p.then(() => synchronizeNext(dmdBlockNumber));
      });

      return p;
   });
}

module.exports = {
   synchronizeNext: synchronizeNext,
   synchronizeAll: synchronizeAll,
   getLastHdmdRecon: getLastHdmdRecon,
   downloadTxns: downloadTxns,
   getBeginUnmatchedTxns: getBeginUnmatchedTxns,
   getUnmatchedTxns: getUnmatchedTxns,
   reconcile: reconcile,
   downloadDmdTxns: downloadDmdTxns,
   mintToDmd: mintToDmd,
   nothingToMint: nothingToMint,
   getHdmdBlockNumFromDmd: getHdmdBlockNumFromDmd,
   getBeginHdmdBalancesFromDmd: getBeginHdmdBalancesFromDmd,
   didRelativeBalancesChange: didRelativeBalancesChange,
   distributeMint: distributeMint,
   init: init
};
