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
var dmdWallet = require('../client/dmdWallet');
const decimals = config.hdmdDecimals;

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

var reconTxns = require('../models/reconTxn');
var hdmdTxns = require('../models/hdmdTxn');
var burns = require('../models/burn');

const nothingToMint = 'nothing-to-mint';
const formatter = require('../lib/formatter');
var queries = require('../client/databaseQueries');

const burnStatus = {
   pending: 'pending',
   completed: 'completed'
};

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
function getMintingRequired(dmds, hdmds) {
   let required = false;

   dmdTotal = new BigNumber(0);
   dmds.forEach(txn => {
      dmdTotal = dmdTotal.plus(toBigNumber(txn.amount));
   });

   hdmdTotal = new BigNumber(0);
   hdmds.forEach(txn => {
      hdmdTotal = hdmdTotal.plus(toBigNumber(txn.amount));
   });

   let amount = dmdTotal.minus(hdmdTotal);

   return {
      required: !amount.equals(0),
      amount: amount
   };
}

function validateRecon(dmds, hdmds) {
   if (dmds === undefined || hdmds === undefined) {
      return Promise.reject(
         new Error(`parameters dmds and hdmds cannot be undefined`)
      );
   }

   // calculate values

   let dmdSum = dmds.map(doc => {
      return new BigNumber(doc.amount);
   });
   dmdSum.push(new BigNumber(0));
   dmdSum = dmdSum.reduce((a, b) => {
      return a.plus(b);
   });

   let hdmdSum = hdmds.map(doc => {
      return new BigNumber(doc.amount);
   });
   hdmdSum.push(new BigNumber(0));
   hdmdSum = hdmdSum.reduce((a, b) => {
      return a.plus(b);
   });

   // log result
   logger.log(
      `
[RECON] Validating before reconciliation. Totals for DMD = ${dmdSum}, HDMD = ${
         hdmdSum
      }. Count for DMD = ${dmds.length}, HDMD = ${hdmds.length}.
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
         amount: typeConverter.numberDecimal(txn.amount),
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
         amount: typeConverter.numberDecimal(txn.amount),
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
   return validateRecon(dmds, hdmds).then(() => {
      return unsafeReconcile(dmds, hdmds);
   });
}

/**
 * Invoke mint on HDMD smart contract and reconcile with DMDs
 * @param {<Dmd>[]} dmds - DMD transactions to be matched
 * @param {<Hdmd>[]} hdmds - HDMD transactions to be matched
 * @return {Promise.<{txnHash: string, amount: <BigNumber>}>} result of the promise
 */
function netMint(amount) {
   return new Promise((resolve, reject) => {
      let txnHashResolved;
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
         return Promise.reject(
            new Error('Error downloading DMDs: ' + err.stack)
         );
      }),
      downloadHdmdTxns()
   ]).then(() => logger.log('Download of DMD and HDMD txns completed.'));
}

/**
 * Retrieve unmatched transactions from MongoDB at the beginning of the block
 * @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
 */
function getBeginUnmatchedTxns(dmdBlockNumber) {
   let getUnmatchedDmds = dmdClient.getBeginUnmatchedTxns;
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;

   return Promise.all([getUnmatchedDmds(dmdBlockNumber), getUnmatchedHdmds()]);
}

/**
 * Retrieve unmatched transactions from MongoDB at the end of the block
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
function distributeMintToBalances(amount, balances) {
   if (!balances || balances.length === 0) {
      return;
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
            : [];
      }

      let hdmdBlockNum = filtered[dmdBackSteps]
         ? filtered[dmdBackSteps].hdmdBlockNumber
         : null;
      return hdmdBlockNum;
   });
}

/**
 * Download and reconcile new HDMDs with DMDs if the total amounts are equal between both.
 * @param {dmds} dmds - dmds to reconcile with hdmds
 */
function reconcileNewHdmds(dmds) {
   let getUnmatchedHdmds = hdmdClient.getUnmatchedTxns;
   return downloadHdmdTxns()
      .then(() => {
         return getUnmatchedHdmds();
      })
      .then(hdmds => {
         // Reconcile
         let hasUnmatched = dmds.length > 0 || hdmds.length > 0;
         let mintStatus = getMintingRequired(dmds, hdmds);
         if (hasUnmatched && !mintStatus.required) {
            return reconcile(dmds, hdmds);
         }
      });
}

function getBurnedHdmds(hdmds) {
   return hdmds.filter(hdmd => {
      return hdmd.eventName === hdmdClient.eventNames.burn;
   });
}

// TODO:
function getNewBurnedHdmds() {
   // filter HDMDS using IN objectID
   // filter HDMDS using NOT IN hdmdTxnHash
   let burnEventName = hdmdClient.eventNames.burn;
   return hdmdTxns.aggregate([
      {
         $match: { eventName: burnEventName }
      }
   ]);
}

function excludeBurnedHdmds(hdmds) {
   return hdmds.filter(hdmd => {
      return hdmd.eventName != hdmdClient.eventNames.burn;
   });
}

function reconcileDmdBurns(dmds, burns) {
   let burnedDmds = [];
   let burnedHdmds = [];

   dmds.forEach(dmd => {
      let burn = burns.filter(burn => {
         return burn.dmdTxnHash === dmd.txnHash;
      })[0];
      if (burn != undefined) {
         burnedDmds.push(dmd);
         burnedHdmds.push({
            txnHash: burn.hdmdTxnHash,
            amount: new BigNumber(burn.amount).times(-1),
            account: burn.account,
            sendToAddress: burn.sendToAddress,
            eventName: burn.eventName
         });
      }
   });

   return updateBurnStatus(burns.map(b => b._id), burnStatus.completed).then(
      () => reconcile(burnedDmds, burnedHdmds)
   );
}

/**
 * Update status of burns
 * @param {String[]} ids
 * @param {String[]} status
 */
function updateBurnStatus(ids, status) {
   if (ids === undefined) {
      return Promise.resolve();
   }
   let p = Promise.resolve();
   ids.forEach(id => {
      p = p.then(() => {
         return burns.update({ _id: id }, { $set: { status: status } });
      });
   });
   return p;
}

/**
 * Gets burns that match the DMD txn hashes
 * @param {DmdTxns[]} dmds
 */
function getBurnsFromDmds(dmds) {
   let dmdTxnHashes = dmds.map(dmd => {
      return dmd.txnHash;
   });
   return burns.aggregate([
      {
         $match: {
            $and: [
               { dmdTxnHash: { $in: dmdTxnHashes } }
               // { status: { $eq: 'pending' } }
            ]
         }
      }
   ]);
}

/**
 * Gets burns that match the HDMD txn hashes
 * @param {HdmdTxns[]} hdmds
 */
function getBurnsFromHdmds(hdmds) {
   let hdmdTxnHashes = hdmds.map(hdmd => {
      return hdmd.txnHash;
   });
   return burns.aggregate([
      {
         $match: {
            $and: [
               { hdmdTxnHash: { $in: hdmdTxnHashes } }
               // { status: { $eq: 'pending' } }
            ]
         }
      }
   ]);
}

function getBurnsFromStatus(status) {
   burns.aggregate([
      {
         $match: {
            status: status
         }
      }
   ]);
}

function completeDmdBurns(dmds) {
   return getBurnsFromDmds(dmds).then(burns => {
      if (burns.length > 0) {
         return reconcileDmdBurns(dmds, burns).then(() => {});
         // TODO: then return excluded
      }
   });
}

/**
 * Fulfil the burn event by invoking dmdWallet.sendTransaction and saving the txn status
 * @param {<HdmdTxns>[]} hdmds - hdmdTxn documents with the 'Burn' eventName
 */
function fulfilBurns(hdmds) {
   let p = Promise.resolve();
   let stashedBurns = [];

   hdmds.forEach(hdmd => {
      p = p.then(() => {
         let newAmount = new BigNumber(hdmd.amount).times(-1);
         return dmdWallet
            .sendToAddress(hdmd.sendToAddress, newAmount.toNumber())
            .then(createdTxn => {
               stashedBurns.push({
                  timestamp: new Date(),
                  dmdTxnHash: createdTxn.txnHash,
                  hdmdTxnHash: hdmd.txnHash,
                  amount: typeConverter.numberDecimal(newAmount),
                  account: hdmd.account,
                  sendToAddress: hdmd.sendToAddress,
                  status: burnStatus.pending,
                  response: 'Successfully invoked sendToAddress on DMD wallet'
               });
            })
            .catch(err => {
               stashedBurns.push({
                  timestamp: new Date(),
                  dmdTxnHash: null,
                  hdmdTxnHash: hdmd.txnHash,
                  amount: typeConverter.numberDecimal(newAmount),
                  account: hdmd.account,
                  sendToAddress: hdmd.sendToAddress,
                  status: 'error',
                  response: err.message
               });
            });
      });
   });
   p = p.then(() => {
      return burns
         .create(stashedBurns)
         .then(created => created)
         .catch(err =>
            Promise.reject('Error saving burns to DB: ' + err.message)
         );
   });
   return p;
}

/**
 * Format balances for distributeMint()
 * @param {*} balances
 */
function formatBalances(balances) {
   return balances.map(bal => {
      var newBal = {};
      Object.assign(newBal, bal);
      newBal.balance = new BigNumber(bal.balance);
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
}

/**
 * Distribute amount to latest HDMD balances
 * @param {<BigNumber>} mintAmount
 */
function distributeMint(mintAmount) {
   let getHdmdBalances = queries.hdmd.getHdmdBalances;
   return getHdmdBalances().then(bals => {
      return distributeMintToBalances(mintAmount, formatBalances(bals));
   });
}

/**
Finds unmatched dmdTxns and hdmdTxns in MongoDB
then invokes mint and unmint on HDMD eth smart contract
Mint HDMDs up to dmdBlockNumber to make HDMD balance equal to DMD balance
* @return {Promise} - returns an empty promise if resolved
*/
function synchronizeNext(dmdBlockNumber) {
   let getBeginUnmatchedDmds = dmdClient.getBeginUnmatchedTxns;

   if (dmdBlockNumber === null || dmdBlockNumber === undefined) {
      logger.log(`Synchronizing up to latest DMD Block`);
   } else {
      logger.log(`Synchronizing up to DMD Block ${dmdBlockNumber}`);
   }

   return getBeginUnmatchedDmds(dmdBlockNumber)
      .then(dmds => {
         return getBurnsFromDmds(dmds).then(burns => {
            if (burns.length > 0) {
               return reconcileDmdBurns(dmds, burns);
            }
         });
      })
      .then(() => {
         return getBeginUnmatchedTxns(dmdBlockNumber);
      })
      .then(([dmds, hdmds]) => {
         let burnedHdmds = getBurnedHdmds(hdmds); // excluding what's burned
         let hdmdsExceptBurns = excludeBurnedHdmds(hdmds);
         if (burnedHdmds.length > 0) {
            return fulfilBurns(burnedHdmds).then(() => [
               dmds,
               hdmdsExceptBurns
            ]);
         }
         return [dmds, hdmdsExceptBurns];
      })
      .then(([dmds, hdmds]) => {
         let p = Promise.resolve();
         let mintStatus = getMintingRequired(dmds, hdmds);
         let mintAmount = mintStatus.amount;
         let mintRequired = mintStatus.required;

         if (mintRequired && mintAmount.greaterThan(0)) {
            p = p
               .then(() => netMint(mintAmount))
               .then(() => distributeMint(mintAmount));
         } else if (mintRequired && mintAmount.lessThan(0)) {
            p = p
               .then(() => distributeMint(mintAmount))
               .then(() => netMint(mintAmount));
         }
         return p.then(() => dmds);
      })
      .then(dmds => {
         return reconcileNewHdmds(dmds);
      })
      .catch(err => {
         return Promise.reject(err);
      });
}

function synchronizeAll() {
   let getUnmatchedDmdBlockIntervals =
      queries.recon.getUnmatchedDmdBlockIntervals;

   return downloadTxns()
      .then(() => getUnmatchedDmdBlockIntervals())
      .then(dmdBlockNumbers => {
         let p = Promise.resolve();
         dmdBlockNumbers.push(null); // null or undefined means there's no next blocknumber to be used in the filter
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
   getUnmatchedTxnsBefore: getBeginUnmatchedTxns,
   getUnmatchedTxns: getUnmatchedTxns,
   reconcile: reconcile,
   downloadDmdTxns: downloadDmdTxns,
   mintToDmd: netMint,
   nothingToMint: nothingToMint,
   getHdmdBlockNumFromDmd: getHdmdBlockNumFromDmd,
   distributeMint: distributeMintToBalances,
   init: init
};
