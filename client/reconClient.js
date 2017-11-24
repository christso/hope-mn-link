// Blockchain Reconciliation

var config = require('../config');
var mongoose = require('mongoose');
var BigNumber = require('bignumber.js');
const uuidv4 = require('uuid/v4');
var Logger = require('../lib/logger');
var logger = new Logger('RECON');

var port = config.port;

let dmdClient = require('../client/dmdClient');
let hdmdClient = require('../client/hdmdClient');

var mintDocs = require('../models/mint');
var reconTxns = require('../models/reconTxn');

const nothingToMint = 'nothing-to-mint';
const formatter = require('../lib/formatter');
var queries = require('../client/databaseQueries');

var formatUuidv1 = formatter.formatUuidv1;

function downloadDmdTxns() {
   return dmdClient
      .downloadTxns()
      .then(result => {
         if (result) {
            logger.log('Downloaded DMD Transactions from CryptoID', result);
         } else {
            logger.log(
               'Downloaded DMD Transactions from CryptoID - no changes found'
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
            logger.log('Downloaded HDMD Transactions from Ethereum network');
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
      dmdTotal = dmdTotal.plus(txn.amount);
   });

   hdmdTotal = new BigNumber(0);
   hdmds.forEach(txn => {
      hdmdTotal = hdmdTotal.plus(txn.amount);
   });

   return dmdTotal.minus(hdmdTotal);
}

/**
   * Reconcile HDMDs with DMDs in ReconTxns MongoDB collection
   * @param {Object[]} dmds - DMD transactions to be reconciled
   * @param {Object[]} hdmds - HDMD transactions to be reconciled
   * @return {Promise.<ReconTxns[]>} result of the promise
   */
function reconcile(dmds, hdmds) {
   if (dmds === undefined || hdmds === undefined) {
      return Promise.reject(`parameters dmds and hdmds cannot be undefined`);
   }
   let reconId = formatUuidv1(uuidv4());
   let dmdRecs = dmds.map(txn => {
      return {
         reconId: reconId,
         dmdTxnHash: txn.txnHash,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber
      };
   });
   let hdmdRecs = hdmds.map(txn => {
      return {
         reconId: reconId,
         hdmdTxnHash: txn.txnHash,
         amount: txn.amount,
         account: txn.account,
         blockNumber: txn.blockNumber,
         eventName: txn.eventName
      };
   });
   let recs = dmdRecs;
   recs.push(...hdmdRecs);
   return reconTxns.create(recs);
}

/**
   * Invoke mint on HDMD smart contract and reconcile with DMDs
   * @param {<Dmd>[]} dmds - DMD transactions to be matched
   * @param {<Hdmd>[]} hdmds - HDMD transactions to be matched
   * @return {Promise.<{txnHash: string, amount: number}>} result of the promise
   */
function mintToDmd(dmds, hdmds) {
   return new Promise((resolve, reject) => {
      let amount = getRequiredMintingAmount(dmds, hdmds);
      let txnHashResolved;
      if (amount.gt(0)) {
         txnHashResolved = hdmdClient.mint(amount);
         txnHashResolved
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount.toNumber()
               };
               logger.log(`Mint invoked = ${JSON.stringify(mintTxn)}`);
               resolve(mintTxn);
            })
            .catch(err => reject(err));
      } else if (amount.lt(0)) {
         txnHashResolved = hdmdClient.unmint(amount.mul(-1));
         txnHashResolved
            .then(txnHash => {
               let mintTxn = {
                  txnHash: txnHash,
                  amount: amount.mul(-1).toNumber()
               };
               logger.log(`Unmint invoked = ${JSON.stringify(mintTxn)}`);
               resolve(mintTxn);
            })
            .catch(err => reject(err));
      } else {
         resolve(nothingToMint);
      }
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
* Gets HDMD account balances at the specified DMD blockNumber
* @param {number} blockNumber - DMD blockNumber to get the balance for
* @return {{addresses: string[], balances: number[]}}  - { addresses[], balances[] }
*/
function getHdmdBalancesFromDmd(blockNumber) {
   let matchStage = {
      $match: {
         hdmdTxnHash: { $ne: null },
         blockNumber: { $lte: blockNumber }
      }
   };

   let groupStage = {
      $group: {
         _id: '$account',
         totalAmount: { $sum: '$amount' }
      }
   };

   if (blockNumber === undefined) {
      delete matchStage.$match.blockNumber;
   }

   // get balances from hdmdtxns collection
   return reconTxns.aggregate([matchStage, groupStage]).catch(err => {
      let newErr = new Error(
         `Error in getHdmdBalancesFromDmd(): ${err.message}`
      );
      Promise.reject(newErr);
   });
}

/**
* Download transactions to MongoDB
* @return {Promise.<[DmdTxn[], HdmdTxn[]]>} - returns resolved promise for unmatched DMDs and HDMDs
*/
function downloadTxns() {
   return Promise.all([downloadDmdTxns(), downloadHdmdTxns()]);
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
 * @param {{_id: string, totalAmount: number}[]} balances 
 * @returns {Promise}
 */
function distributeMint(amount, balances) {
   if (!balances) {
      return Promise.reject(new Error(`Balances cannot be undefined`));
   }
   let recipients = balances.map(b => b._id);
   let weights = balances.map(b =>
      formatter.round(b.totalAmount, config.hdmdDecimals)
   );

   return hdmdClient.apportion(amount, recipients, weights).catch(err => {
      return Promise.reject(
         new Error(`Error apportioning minted amount: ${err.stack}`)
      );
   });
}

/**
 If the dmdBlockNum is greater than the most recent DMD block number in recon txn, then it will be the most recent HDMD block number. Otherwise, it will be the the previous HDMD block number, looking back 'backsteps' steps.
 * @param {Number} dmdBlockNum - DMD block number associated with the recon txn
 * @param {Number} backsteps - number of HDMD block numbers to look back.
 */
function getHdmdBlockNumFromDmd(dmdBlockNum, backsteps) {
   let getHdmdBlocksByRecon = queries.recon.getHdmdBlocksUpToRecon;
   let getReconByDmdBlock = queries.recon.getReconByDmdBlock;
   let getHdmdBalancesByBlock = queries.recon.getHdmdBalancesFromBlock;
   let getHdmdBlocksUpToRecon = queries.recon.getHdmdBlocksUpToRecon;

   var p = Promise.resolve();
   var matchedDmdBlockNum;

   if (backsteps === undefined) {
      backsteps = 0;
   }
   // Compute Balances
   return getReconByDmdBlock(dmdBlockNum, backsteps)
      .then(recon => {
         // if inputDmdBlock greater than max(reconTxns.dmdBlock), get current
         matchedDmdBlockNum = recon[0] ? recon[0].blockNumber : null;
         return getHdmdBlocksUpToRecon(recon[0].reconId).then(hdmdBlocks => {
            return hdmdBlocks ? hdmdBlocks : [];
         });
      })
      .then(hdmdBlocks => {
         let lookBack = 1 + backsteps;
         if (dmdBlockNum > matchedDmdBlockNum) {
            lookBack = 0 + backsteps;
         }
         let hdmdBlockNum = hdmdBlocks[lookBack]
            ? hdmdBlocks[lookBack].blockNumber
            : null;
         return hdmdBlockNum;
      });
}

function getHdmdBlockNumFromDmdSteps(dmdBlockNum, backsteps) {
   if (backsteps === undefined) {
      backsteps = 0;
   }
   var getIntersects = queries.recon.getIntersects;
   return getIntersects().then(recons => {
      let hdmdBlockNum = recons.filter(r => r.dmdBlockNumber < dmdBlockNum)[1]
         .hdmdBlockNumber;
      return hdmdBlockNum;
   });
}

function getHdmdBalancesFromDmdSteps(dmdBlockNum, backsteps) {
   if (backsteps === undefined) {
      backsteps = 0;
   }
   return getHdmdBlockNumFromDmdSteps(
      dmdBlockNum.backsteps
   ).then(hdmdBlockNum => {
      return getHdmdBalancesFromBlock(hdmdBlockNum);
   });
}

function getHdmdBalancesFromDmd(dmdBlockNum, backsteps) {
   let getHdmdBalancesFromBlock = queries.recon.getHdmdBalancesFromBlock;

   return getHdmdBlockNumFromDmd(dmdBlockNum, backsteps)
      .then(hdmdBlockNum => {
         return getHdmdBalancesFromBlock(hdmdBlockNum);
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
      return getHdmdBalancesFromDmd(dmdBlockNum, backsteps).then(bals => {
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
* Waits for downloads to complete,
then finds unmatched dmdTxns and hdmdTxns in MongoDB
then invokes mint and unmint on HDMD eth smart contract
* @return {Promise} - returns an empty promise if resolved
*/
function synchronizeAll() {
   let dmds;
   let hdmds;

   // Download transactions and get what is unmatched
   let p = downloadTxns()
      .then(() => getLastSavedDmdBlockInterval())
      .then(dmdBlockNumber => getUnmatchedTxns(dmdBlockNumber));

   // Invoke mint to synchronize HDMDs with DMDs
   p = p.then(values => {
      dmds = values[0];
      hdmds = values[1];
      return mintToDmd(dmds, hdmds);
   });

   // Reconcile Txns if minting not required
   p = p.then(minted => {
      if (minted === nothingToMint) {
         reconcile(dmds, hdmds).then(recs => {
            let length = recs ? recs.length : 0;
            logger.log(`Reconciled ${length} transactions`);
         });
      }
      return minted;
   });

   // If we have just minted, then distribute the minted amount to entitled recipients
   p = p.then(minted => {
      if (minted == nothingToMint) {
         return;
      }
      if (!minted || !minted.amount) {
         return Promise.reject(
            new Error('Expected minted amount to be non-zero')
         );
      }
      getLastHdmdRecon()
         .then(reconObj =>
            getHdmdBalancesFromDmd(reconObj ? reconObj.blockNumber : undefined)
         )
         .then(balances => distributeMint(minted.amount, balances));
   });
   return p;
}

module.exports = {
   synchronizeAll: synchronizeAll,
   getLastHdmdRecon: getLastHdmdRecon,
   getBalancesDmdToHdmd: getHdmdBalancesFromDmd,
   downloadTxns: downloadTxns,
   getUnmatchedTxns: getUnmatchedTxns,
   reconcile: reconcile,
   downloadDmdTxns: downloadDmdTxns,
   mintToDmd: mintToDmd,
   nothingToMint: nothingToMint,
   getHdmdBlockNumFromDmd: getHdmdBlockNumFromDmd,
   getHdmdBalancesFromDmd: getHdmdBalancesFromDmd,
   didRelativeBalancesChange: didRelativeBalancesChange,
   getHdmdBlockNumFromDmdSteps: getHdmdBlockNumFromDmdSteps,
   getHdmdBalancesFromDmdSteps: getHdmdBalancesFromDmdSteps
};
