module.exports = (function() {
   const initialSupply = 12000;
   const ownerAccount = '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC';

   //[18386, 18388, 18584, 23742, 27962, 28022]
   var dmdBlockIntervals = [18386, 18388, 18584, 23730].map(b => {
      return { blockNumber: b };
   });

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

   var expectedReconAmounts = [
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '-1',
         totalAmount: 12000
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '1',
         totalAmount: 150
      },
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         blockNumber: '2',
         totalAmount: 477.34482327
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         blockNumber: '2',
         totalAmount: 1288.83102282
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         blockNumber: '2',
         totalAmount: 2670.68499517
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '2',
         totalAmount: -4436.86084125
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '3',
         totalAmount: -2150
      },
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         blockNumber: '4',
         totalAmount: -102.629137
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         blockNumber: '4',
         totalAmount: -277.09866991
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         blockNumber: '4',
         totalAmount: -574.19727396
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '4',
         totalAmount: 953.92508087
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '5',
         totalAmount: 400
      },
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         blockNumber: '6',
         totalAmount: 14.41214178
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         blockNumber: '6',
         totalAmount: 38.9127828
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         blockNumber: '6',
         totalAmount: 80.63414312
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '6',
         totalAmount: -133.95906771
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '7',
         totalAmount: 200
      },
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         blockNumber: '8',
         totalAmount: 7.34203449
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         blockNumber: '8',
         totalAmount: 19.82349313
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         blockNumber: '8',
         totalAmount: 41.07777103
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '8',
         totalAmount: -68.24329864
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '9',
         totalAmount: 0
      },
      {
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         blockNumber: '10',
         totalAmount: 0
      },
      {
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         blockNumber: '10',
         totalAmount: 0
      },
      {
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         blockNumber: '10',
         totalAmount: 0
      },
      {
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         blockNumber: '10',
         totalAmount: 0
      }
   ];

   return {
      initialSupply: initialSupply,
      ownerAccount: ownerAccount,
      dmdBlockIntervals: dmdBlockIntervals,
      dmdTxnsData: dmdTxnsData,
      hdmdEventsData: hdmdEventsData,
      expectedReconAmounts: expectedReconAmounts
   };
})();
