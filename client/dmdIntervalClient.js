var mongoose = require('mongoose');
var mongodb = require('mongodb');
var typeConverter = require('../lib/typeConverter');
var formatter = require('../lib/formatter');
var queries = require('../client/databaseQueries');
const reconClient = require('../client/reconClient');
const BigNumber = require('bignumber.js');
const dmdIntervals = require('../models/dmdInterval');

/**
 * Gets HDMD account balances at the specified DMD blockNumber
 * @param {number} blockNumber - DMD blockNumber to get the balance for
 * @return {{addresses: string[], balances: number[]}}  - { addresses[], balances[] }
 */
function getHdmdBalancesFromDmdBefore(dmdBlockNum, backsteps) {
   let getHdmdBalancesBefore = queries.recon.getHdmdBalancesBefore;
   let getHdmdBlockNumFromDmd = reconClient.getHdmdBlockNumFromDmd;
   return getHdmdBlockNumFromDmd(dmdBlockNum, backsteps)
      .then(hdmdBlockNum => {
         return getHdmdBalancesBefore(hdmdBlockNum);
      })
      .then(hdmdBals => {
         return hdmdBals;
      });
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

function didRelativeBalancesChange(dmdBlockNum, tolerance) {
   if (tolerance === undefined) {
      tolerance = 0.001;
   }

   let getRelativeBalances = (dmdBlockNum, backsteps) => {
      return getHdmdBalancesFromDmdBefore(dmdBlockNum, backsteps).then(bals => {
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

function updateBlockIntervals(tolerance) {
   let getBlockNumbersForIntervals = queries.dmd.getBlockNumbersForIntervals;
   let createBlockIntervals = queries.dmd.createBlockIntervalsFromArray;
   return getBlockNumbersForIntervals().then(dmdBlockNumbers => {
      var newBlockIntervals = [];
      let p = Promise.resolve();
      dmdBlockNumbers.forEach(dmdBlockNum => {
         p = p
            .then(() => {
               return didRelativeBalancesChange(dmdBlockNum, tolerance);
            })
            .then(hasChanged => {
               if (hasChanged) {
                  newBlockIntervals.push(dmdBlockNum);
               }
            });
      });
      return p.then(() => {
         return createBlockIntervals(newBlockIntervals)
            .then(newlyCreated => {
               return newlyCreated;
            })
            .catch(err => {
               return Promise.reject(
                  `CreateBlockIntervalsError: ` + err.message
               );
            });
      });
   });
}

module.exports = {
   getHdmdBalancesFromDmdBefore: getHdmdBalancesFromDmdBefore,
   didRelativeBalancesChange: didRelativeBalancesChange,
   compareBalances: compareBalances,
   updateBlockIntervals: updateBlockIntervals
};
