module.exports = (function() {
   var dmdBlockIntervals = [18386, 18584, 23742, 27962, 28022].map(b => {
      return { blockNumber: b };
   });

   var dmdTxnsData = [
      {
         txnHash:
            'DE64758DD95EE59B9F7ED45404321D48D9FCC7087D7E90CE68730B03CDC49FAC',
         blockNumber: 18386,
         amount: 10000
      },
      {
         txnHash:
            'D8FC32F7084C9AA4EEA65B2A12B90BADF0A526015FF081D9E2E8A19E6E0085B4',
         blockNumber: 18584,
         amount: 1.5275
      },
      {
         txnHash:
            '15AF02476D9382FA7C70A5904B76294BFF3B0F4D134D5807C5A227AB5B2F6F2A',
         blockNumber: 18759,
         amount: 1.5275
      },
      {
         txnHash:
            '234A7D28C5F654DD7EF6407FBBE379636652EAED8A88E803B0112E5652861166',
         blockNumber: 18889,
         amount: 1.5275
      },
      {
         txnHash:
            '18086BC1FBBD4C279E84080A537CBC0215133ADA55817BA76C4457C131FACA28',
         blockNumber: 18996,
         amount: 1.5275
      },
      {
         txnHash:
            '52DDA582846AC2085F912FFF829928C32CEC27E90E41650484A3D2BC6BD4C81F',
         blockNumber: 19118,
         amount: 1.5275
      },
      {
         txnHash:
            '505ACF1ADC7AA676C2132EFF4BCB55B26AF1BF61A02F653518EA7947DB52D0C2',
         blockNumber: 19261,
         amount: 1.5275
      },
      {
         txnHash:
            '9C236C0BC36C10ACE386F2F6FDEDD7B65C4D0DBCDFF84D802D6C47432CCBE47E',
         blockNumber: 19377,
         amount: 1.5275
      },
      {
         txnHash:
            '1EE46DB80510DB4FDAFF31209527F06429B30E5E465DDCE26F490A7BEFB50AAC',
         blockNumber: 19497,
         amount: 1.5275
      },
      {
         txnHash:
            'ACB4DFC3A68A605FF849627865E3D4A01351EE7F956B1DB42EC12D005824C828',
         blockNumber: 19605,
         amount: 1.5275
      },
      {
         txnHash:
            'C60E185AEF05DD59BDA1BD5AA53D6A6B236A0C6C4BE88DED7AAF4CDC866F7B75',
         blockNumber: 19740,
         amount: 1.5275
      },
      {
         txnHash:
            '436EB0EDB146EA98D2FF77A371C430109F7C6CB48524F24E92BC268FC82B4EE8',
         blockNumber: 19869,
         amount: 1.5275
      },
      {
         txnHash:
            '194F023BCB3FC9E14F588C620E84BC38FF5A4F0ECAA38438C6A52218001ADB17',
         blockNumber: 19982,
         amount: 1.5275
      },
      {
         txnHash:
            '5DC166AC84D3C9BA10FB667762B75EB1CF62EC174822ED28C80A785898C86431',
         blockNumber: 20135,
         amount: 1.5275
      },
      {
         txnHash:
            '32A1B30865FC82401D899D30AE035F258240B822428446F3F83BD94E9B4C2C11',
         blockNumber: 20253,
         amount: 1.5275
      },
      {
         txnHash:
            'C4AAA7758EDBEF8E8E177FBCB4F7F94F40679AA6EF5CCDA1E99EA6484BCA53A9',
         blockNumber: 20376,
         amount: 1.5275
      },
      {
         txnHash:
            '9600B92115404A96B0B844E7AA4365D844288F4145B6348BB801673AC5372890',
         blockNumber: 20489,
         amount: 1.5275
      },
      {
         txnHash:
            'CCFE3E09B1330421D9B5CFF48364E8237B98DBA4ECA4D9B83099D45F9B2DE604',
         blockNumber: 20604,
         amount: 1.5275
      },
      {
         txnHash:
            'E61DA86016EF6D3BB0403AC8816FB52B8B4A5F7FA83A3268E851D802906E9AA2',
         blockNumber: 20730,
         amount: 1.5275
      },
      {
         txnHash:
            '415814D6A6CDD3A1866A97D70950CBB74151F39F8F0E99A3B3F41CF293FB65A2',
         blockNumber: 20863,
         amount: 1.5275
      },
      {
         txnHash:
            'AAAE76E927022DFFC138A60D17DB21CEFA61CC3E663EBF1EC2F3A7AB0F4A21C5',
         blockNumber: 20991,
         amount: 1.5275
      },
      {
         txnHash:
            'C2E9B31C5B85678603AAF194296D81C7B804DFD778C45109FC23E9A19DE6C8E5',
         blockNumber: 21109,
         amount: 1.5275
      },
      {
         txnHash:
            '107528048D26A9B2D238F37C4DE7050C0C478F2F9FFF2D09012105036E74C720',
         blockNumber: 21232,
         amount: 1.5275
      },
      {
         txnHash:
            '85D2B4842737DA504E86E7FC202FAA4F6C624E3F05600EC614F45B09C7C15AC7',
         blockNumber: 21353,
         amount: 1.5275
      },
      {
         txnHash:
            'F6B85A9B287AF28D21B855740821D00B354FB6CE66C2A316C366A098199ED453',
         blockNumber: 21470,
         amount: 1.5275
      },
      {
         txnHash:
            'B8D5C433B7E9E4DFE3E077FAE4D68CF0259940B3DF17245074408F051A11C2A0',
         blockNumber: 21630,
         amount: 1.5275
      },
      {
         txnHash:
            'D374368E895BA76CD5BDB44ADBB555E2CD8C98DABADA3557B3798546693615E6',
         blockNumber: 21758,
         amount: 1.5275
      },
      {
         txnHash:
            'ABC4030A825D84A4394B7EB2F13EA0338591CDD8F27F56B8EB45E015A4FC6251',
         blockNumber: 21915,
         amount: 1.5275
      },
      {
         txnHash:
            '38C224EFD1A5C223BC7E810DCBF511E824876E20804BC951887371D0A589E7E2',
         blockNumber: 22038,
         amount: 1.5275
      },
      {
         txnHash:
            '41E63849DE3CC375544F22C27B88C0936B8166DE9028FED2B3C4297EB3B2B51B',
         blockNumber: 22163,
         amount: 1.5275
      },
      {
         txnHash:
            'B65FC03D53258CE6DB795335995E7621EF7A7B2F183B6E7B1F31307E469D1EFD',
         blockNumber: 22290,
         amount: 1.5275
      },
      {
         txnHash:
            '9DB150945A88E4F79D5B73D7AAAAE874BBF60D44483D9319053D71A05AAE22FE',
         blockNumber: 22401,
         amount: 1.5275
      },
      {
         txnHash:
            '43E77D904C71C3E5C4B03775E1B205F86AEC1CC0D6EEFCB527FC7059AE8F921C',
         blockNumber: 22545,
         amount: 1.5275
      },
      {
         txnHash:
            '73F7EA445B013F9B47B379B095E7035A7D4DA799D295BB849B5FD9112DF6E250',
         blockNumber: 22658,
         amount: 1.5275
      },
      {
         txnHash:
            'CBC1483A9D7FB5FD5411B80257DC1107C20E27AB0D4B6903BE7CDC64EBB16C1E',
         blockNumber: 22780,
         amount: 1.5275
      },
      {
         txnHash:
            '64CA57AF823A7D267A616353D5BFCCBEFD2641237B40888395F5F70F9F4FD831',
         blockNumber: 22897,
         amount: 1.5275
      },
      {
         txnHash:
            'A85C9AE427A995EB58C5D3EF42A3BEEAB9925BE9F7119D0D881894AF94373094',
         blockNumber: 23021,
         amount: 1.5275
      },
      {
         txnHash:
            '844312FB68D8419E788CC6DD004458DCC6817EADA5414E6C73A9D12A8FF2FA63',
         blockNumber: 23136,
         amount: 1.5275
      },
      {
         txnHash:
            'B5C38D1394AA26BED97296CF2BE256662D510550BAC406B1834F342ABD66AA50',
         blockNumber: 23259,
         amount: 1.5275
      },
      {
         txnHash:
            '39EEDF470149EBE7E50CEA6EE6BCA63819C4B8FB0F4DA04A304C2E38A71BBE8D',
         blockNumber: 23742,
         amount: 0.82242805
      },
      {
         txnHash:
            '188A8117F0824264C87BEE29F42CFFC5CE2F583B886DB6C60B700B2FAC3C9493',
         blockNumber: 23819,
         amount: 1.5275
      },
      {
         txnHash:
            '15204514589CAA599CD17B857FF45C70C4F651B59E6F67661981257728E5ABE0',
         blockNumber: 23949,
         amount: 1.5275
      },
      {
         txnHash:
            'E1D67F392AE297A6898A55268F3FB3E2383FBF0D9EC70DF41862B85424C28C8B',
         blockNumber: 24070,
         amount: 1.5275
      },
      {
         txnHash:
            'DEBC660E3B59E82BEFF3E6CD0BA4639281C0C8B8A1FF099E21455148B75E9AD9',
         blockNumber: 24191,
         amount: 1.5275
      },
      {
         txnHash:
            '2296DB341D88010D65E809070D7FE23DA260AE175BEF555665BBD6834E83A601',
         blockNumber: 24328,
         amount: 1.5275
      },
      {
         txnHash:
            'E613C4ED00393B1DBA97D47A873197CCFBDD8E3075B07FEF00D8586E45018A5B',
         blockNumber: 24451,
         amount: 1.5275
      },
      {
         txnHash:
            '2FBDB44A6A8C3CCB9E801734E94B47E03D42795B8855921D90C30C726DA48768',
         blockNumber: 24567,
         amount: 1.5275
      },
      {
         txnHash:
            '8F51B3CEB5869506F3EA7167513DE3F5C2DE4CCBD54FD0729520BB0592B7990F',
         blockNumber: 24689,
         amount: 1.5275
      },
      {
         txnHash:
            '38899C840587786A9384C5B891AE85093453445E423AA0BA64C35613DFAB95BE',
         blockNumber: 24806,
         amount: 1.5275
      },
      {
         txnHash:
            '42D280A701ABF42E950408162E335E21250D244CAFE546567AA24CA68A23C896',
         blockNumber: 24924,
         amount: 1.5275
      },
      {
         txnHash:
            'C6AAE71A864A6163FFECC479EDDB4044373B574A98204DCF7C22BABC8EC6378D',
         blockNumber: 25048,
         amount: 1.5275
      },
      {
         txnHash:
            'B22886009D35AC99E09F1F01AFEC1BA932AD9040F7864C01742014380429FBCE',
         blockNumber: 25166,
         amount: 1.5275
      },
      {
         txnHash:
            'BA02FEC0D004E07CECC7B29E75D0C3849E0E4FB3BA50C3E42B425A0130A2A617',
         blockNumber: 25294,
         amount: 1.5275
      },
      {
         txnHash:
            'A1E2C4B5C805CBEE87F049595FF25288839E2B252DA938A09F8038FA3C581A79',
         blockNumber: 25416,
         amount: 1.5275
      },
      {
         txnHash:
            'FAF836893B337344D084F50A8B9280BFC7FB22AFE465445DAFB7B1F3C9479946',
         blockNumber: 25540,
         amount: 1.5275
      },
      {
         txnHash:
            '60069B2AD171C53F96F95E12EB81365739D0BAC8A1A4B5B7C9618A12CD9DD468',
         blockNumber: 25658,
         amount: 1.5275
      },
      {
         txnHash:
            '5DFF319CF9DCF37B8792653054D2D6979C55659F2E38CC76B39BF9F43E92BAF4',
         blockNumber: 25786,
         amount: 1.5275
      },
      {
         txnHash:
            'ED6DA787DF72956FDB6F22AB286F9A42A3610A39AFE18A4C7B91881DC739C694',
         blockNumber: 25905,
         amount: 1.5275
      },
      {
         txnHash:
            'E9A11A03C8EEB637EB566D656D35CBAF73598015AC9E8206A575AFFB12DFFA9A',
         blockNumber: 26013,
         amount: 0.82241575
      },
      {
         txnHash:
            '405DE32074365DCCB54F9D444F842768415D21A0C82729CB182E5C84192A7733',
         blockNumber: 26065,
         amount: 1.5275
      },
      {
         txnHash:
            'B25A3FBEECF431C16B8C83813B5F49FF11E0A0A3C77D272BF71A4819E09DE704',
         blockNumber: 26202,
         amount: 1.5275
      },
      {
         txnHash:
            '99BDBC7371D532C4EAB5C76C494862EDA71404F291789E7896ECAAD03321FD26',
         blockNumber: 26331,
         amount: 1.5275
      },
      {
         txnHash:
            '5D235EE585BA245396C997BE021BA02D3701E495B43D1D356EE0E501259EF689',
         blockNumber: 26461,
         amount: 1.5275
      },
      {
         txnHash:
            '740758908CFD1B45926DDADFCBE8B3281510D30951FBCE8D3A5FB7214B91B304',
         blockNumber: 26591,
         amount: 1.5275
      },
      {
         txnHash:
            'E2BCD11263347132E0BD6B45DDF5925380864972B8E0ECB1E35C596D45274F14',
         blockNumber: 26717,
         amount: 1.5275
      },
      {
         txnHash:
            'F06930BFB339A420A38DCBCF1D3F1F810B49A38A8B05212AF9D26921B3E4C991',
         blockNumber: 26840,
         amount: 1.5275
      },
      {
         txnHash:
            '392EBFD262A44E9A9FFA53F81835C6BC3933DEF8209B85EE0FAB5D15C844E7AF',
         blockNumber: 26971,
         amount: 1.5275
      },
      {
         txnHash:
            '8C25D08E3797B14D601B4B0D0278759DC3610333EA78D9B638D39344F8810792',
         blockNumber: 27095,
         amount: 1.5275
      },
      {
         txnHash:
            '798F3799928BB86E68120485C776C42685D525FA50ADE49157A7306A01403015',
         blockNumber: 27220,
         amount: 1.5275
      },
      {
         txnHash:
            '3CD9A2DE7432CE286EB2CD72032F61233CD5E7ACC3931D80A53967EC4D0FD88C',
         blockNumber: 27355,
         amount: 1.5275
      },
      {
         txnHash:
            'BE37B1879F345F68672DCBEF8F2E38AD367B8B758618C8B51D9D72B0E3A83221',
         blockNumber: 27484,
         amount: 1.5275
      },
      {
         txnHash:
            '430B7DBE47590D9A6924870A391EDFF0E37F60F99D8720D30304872C34D4B05E',
         blockNumber: 27616,
         amount: 1.5275
      },
      {
         txnHash:
            '42391A10C10EBE2F3C4248BD6B8C6498773F1FE461E328915B5AC4D54AABDAC4',
         blockNumber: 27758,
         amount: 1.5275
      },
      {
         txnHash:
            '750D42E3778679328CACDEBBC2D99BDCE27D29DC6F2BA1F0D3FA4C40F15F43B0',
         blockNumber: 27898,
         amount: 1.5275
      },
      {
         txnHash:
            '20F510C93536EA31B2649612813E07F57F3D25A6FA4D16A1CA8DA785AA8F1445',
         blockNumber: 27962,
         amount: -5.00050269
      },
      {
         txnHash:
            '3EC131FB9043358EE5DA66BE83A3B4F1E973F9DFB3AEF6B6467D0A20D7D55D19',
         blockNumber: 28022,
         amount: 1.5275
      },
      {
         txnHash:
            'A59253D3DF4DFEB93C30212054AD8E6D3DC9650AF2B22E4FC9161EECB85EAC82',
         blockNumber: 28145,
         amount: 1.5275
      },
      {
         txnHash:
            '87E17916DB04FA1F8CE54CAEBAA8CE3B891330017DDC590704D9B36E7B0E8AC0',
         blockNumber: 28266,
         amount: 1.5275
      },
      {
         txnHash:
            '0436AED873403EBF84A68A4A8E1188A0BA263020CD62188D418E7214A6361500',
         blockNumber: 28282,
         amount: 4.95049505
      },
      {
         txnHash:
            '3FE98C505AD13387D1B49161E0D95D032CD0640B895CD27E649D1896087A71F5',
         blockNumber: 28411,
         amount: 1.5275
      },
      {
         txnHash:
            'CA1EEFC29106CB9DCE9B5A3E79410EB00A811C5846F2392CABE7DD805EFA2EA1',
         blockNumber: 28428,
         amount: 0.8224896
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
      dmdTxnsData: dmdTxnsData,
      dmdBlockIntervals: dmdBlockIntervals,
      contributions: contributions
   };
})();
