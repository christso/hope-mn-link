var typeConverter = require('../lib/typeConverter');

module.exports = (function() {
   const initialSupply = 12000;
   const ownerAccount = '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC';

   var dmdBlockIntervals = [
      {
         blockNumber: 18386,
         eventName: 'mint'
      },
      {
         blockNumber: 18388,
         eventName: 'mint'
      },
      {
         blockNumber: 18584,
         eventName: 'mint'
      },
      {
         blockNumber: 23730,
         eventName: 'mint'
      }
   ];

   var dmdTxnsData = [
      {
         txnHash:
            'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
         blockNumber: 18386,
         amount: 9000
      },
      {
         txnHash:
            '85D2B4842737DA504E86E7FC202FAA4F6C624E3F05600EC614F45B09C7C15AC7',
         blockNumber: 18387,
         amount: 1000
      },
      {
         txnHash:
            '18086BC1FBBD4C279E84080A537CBC0215133ADA55817BA76C4457C131FACA28',
         blockNumber: 18996,
         amount: 200
      },
      {
         txnHash:
            'F6B85A9B287AF28D21B855740821D00B354FB6CE66C2A316C366A098199ED453',
         blockNumber: 22000,
         amount: 200
      },
      {
         txnHash:
            '107528048D26A9B2D238F37C4DE7050C0C478F2F9FFF2D09012105036E74C720',
         blockNumber: 24742,
         amount: 200
      }
   ];

   var hdmdEventsData = [
      {
         txnHash:
            '0x9e48dcad620045e4796ec8aca03a4f7f279a073fcf3ac701008105b0e34235ee',
         blockNumber: 1,
         amount: 150,
         netAmount: 150,
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         eventName: 'Mint'
      }
   ];

   var expectedReconAmounts_c0 = [
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         totalAmount: 416.448981605084
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         totalAmount: 1124.41225037573
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         totalAmount: 2329.98032499765
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         totalAmount: 6679.158443021536
      }
   ];

   var expectedReconAmounts_c1 = [
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         totalAmount: 416.448981605084
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         totalAmount: 1124.41225037573
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         totalAmount: 2329.98032499765
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         totalAmount: 6729.158443
      }
   ];

   var expectedReconAmounts_c2 = [
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         totalAmount: 412.556935045084
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         totalAmount: 1113.90372465573
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         totalAmount: 2308.20480795765
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         totalAmount: 6765.334532341536
      }
   ];

   var contributions = {
      accounts: [
         '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3'
      ],
      amounts: [2670.68499516765, 477.344823265084, 1288.83102281573]
   };

   return {
      initialSupply: initialSupply,
      ownerAccount: ownerAccount,
      dmdBlockIntervals: dmdBlockIntervals,
      dmdTxnsData: dmdTxnsData,
      hdmdEventsData: hdmdEventsData,
      expectedReconAmounts_c0: expectedReconAmounts_c0,
      expectedReconAmounts_c1: expectedReconAmounts_c1,
      expectedReconAmounts_c2: expectedReconAmounts_c2,
      contributions: contributions
   };
})();
