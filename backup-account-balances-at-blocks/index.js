const moment = require('moment');
const fs = require('fs');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const custom_types_js = require('./custom_types.js');

function getWsProviderForArg() {
  let args = process.argv.slice(2);
  let url;
  switch (args[0]) {
    case 'local':
      url = 'ws://127.0.0.1:9944';
      break;
    case 'brickable':
      url = 'wss://brickable.datahighway.com'; // Testnet (Private)
      break;
    case 'harbour':
      url = 'wss://testnet-harbour.datahighway.com'; // Testnet
      break;
    case 'westlake':
      url = 'wss://westlake.datahighway.com'; // Mainnet
      break;
    default:
      let error = 'please provide chain to connect to as an argument';
      console.log(error);
      throw error;
  }
  return url;
}

async function main () {
  const url = getWsProviderForArg();
  const provider = new WsProvider(url);
  let data;
  let custom_types;
  try {
      data = fs.readFileSync('./custom_types.json', 'utf8');
      custom_types = JSON.parse(data);
  } catch (err) {
      console.log(`Error reading file from disk: ${err}`);
  }
  if (Object.keys(custom_types).length == 0) {
    custom_types = custom_types_js;
  }

  // Create the API and wait until ready (optional provider passed through)
  const api = await ApiPromise.create({
    provider,
    types: custom_types,
  });

  const chain = await api.rpc.system.chain();
  console.log('connected to chain: ', chain);

  const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const accountsToCheck = [ALICE, BOB];
  const blocksToCheck = [4800000];

  for (const d of blocksToCheck) {
    // Subscribe and listen to several balance changes
    api.query.system.account.multi(accountsToCheck, (info) => {
      const { data: { free } } = info[0];
      console.log('Change detected, new balances: ', free)
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(-1);
});
