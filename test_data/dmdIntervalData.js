module.exports = (function() {
   var initialSupply = 12000;

   var dmdBlockIntervals = [].map(b => {
      return { blockNumber: b };
   });

   var contribution = [
      {
         accounts: accounts,
         amounts: [640.871654887, 3670.68499516765, 6000.344823265084]
      }
   ];

   var accounts = [
      '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC', //owner
      '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
      '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
      '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
      '0x3b6b857a829fb942A29622da2914776Da35E9611',
      '0x5620040ed2e9B41cC90428d0B8bF4feDf8391beD'
   ];

   var reconTxns = [
      {
         reconId: '241E28BB4D694B638092C75560CBC50C',
         dmdTxnHash: 'AECB37D2DDDB4E89A4F0817EF815CD1B',
         hdmdTxnHash: null,
         amount: 10000,
         blockNumber: 1800,
         account: null,
         eventName: null
      },
      {
         reconId: '241E28BB4D694B638092C75560CBC50C',
         dmdTxnHash: null,
         hdmdTxnHash: '2ACE660141B84AE196304D90859A3379',
         amount: 10000,
         blockNumber: 1,
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         eventName: 'Adjustment'
      },
      {
         reconId: '5D5E3BC2061D4B35B844BCE24AF47F6A',
         dmdTxnHash: null,
         hdmdTxnHash: '75C4B506AB26401CB7D02737B58DCF50',
         amount: -8000,
         blockNumber: 2,
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         eventName: 'Transfer'
      },
      {
         reconId: '5D5E3BC2061D4B35B844BCE24AF47F6A',
         dmdTxnHash: null,
         hdmdTxnHash: '75C4B506AB26401CB7D02737B58DCF50',
         amount: 1000,
         blockNumber: 2,
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         eventName: 'Transfer'
      },
      {
         reconId: '5D5E3BC2061D4B35B844BCE24AF47F6A',
         dmdTxnHash: null,
         hdmdTxnHash: '75C4B506AB26401CB7D02737B58DCF50',
         amount: 4000,
         blockNumber: 2,
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         eventName: 'Transfer'
      },
      {
         reconId: '5D5E3BC2061D4B35B844BCE24AF47F6A',
         dmdTxnHash: null,
         hdmdTxnHash: '75C4B506AB26401CB7D02737B58DCF50',
         amount: 3000,
         blockNumber: 2,
         account: '0x1dd0ef06bAe0226C8165f3507F13c2ad8493e1e3',
         eventName: 'Transfer'
      },
      {
         reconId: '1BB48217B0AB45B6B537E01C1A67E338',
         dmdTxnHash: '0C62D3A9AB25483EB5FC2954DE996FE3',
         hdmdTxnHash: null,
         amount: 100,
         blockNumber: 1810,
         account: null,
         eventName: 'Mint'
      },
      {
         reconId: '1BB48217B0AB45B6B537E01C1A67E338',
         dmdTxnHash: null,
         hdmdTxnHash: 'D33B69845B5441149C83CC2035F4B78F',
         amount: 100,
         blockNumber: 3,
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         eventName: 'Mint'
      },
      {
         reconId: 'BCBD42E0C06044AEB8C58C28BFC921BE',
         dmdTxnHash: null,
         hdmdTxnHash: 'EE023EC5A8AB491FBAEDADF4A8CE15FF',
         amount: -500,
         blockNumber: 4,
         account: '0x114bcdDaB25dE00884755cf8643ED1ceA4093Fd1',
         eventName: 'Transfer'
      },
      {
         reconId: 'BCBD42E0C06044AEB8C58C28BFC921BE',
         dmdTxnHash: null,
         hdmdTxnHash: 'EE023EC5A8AB491FBAEDADF4A8CE15FF',
         amount: 500,
         blockNumber: 4,
         account: '0xA7Bb5D4d546067782Dd4B5356D9e9771deBB06a3',
         eventName: 'Transfer'
      },
      {
         reconId: '1BB48217B0AB45B6B537E01C1A67E338',
         dmdTxnHash: '0C62D3A9AB25483EB5FC2954DE996FE3',
         hdmdTxnHash: null,
         amount: 110,
         blockNumber: 1820,
         account: null,
         eventName: 'Mint'
      },
      {
         reconId: '1BB48217B0AB45B6B537E01C1A67E338',
         dmdTxnHash: null,
         hdmdTxnHash: 'D33B69845B5441149C83CC2035F4B78F',
         amount: 110,
         blockNumber: 5,
         account: '0xe9ce49476F3F2BFE9f0aD21D40D94c6F99990DfC',
         eventName: 'Mint'
      }
   ];

   return {
      dmdBlockIntervals: dmdBlockIntervals,
      reconTxns: reconTxns
   };
})();
