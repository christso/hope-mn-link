module.exports = (function() {
   const initialSupply = 12000;

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
         eventName: 'Mint'
      }
   ];
   return {
      initialSupply: initialSupply,
      dmdBlockIntervals: dmdBlockIntervals,
      dmdTxnsData: dmdTxnsData,
      hdmdEventsData: hdmdEventsData
   };
})();
