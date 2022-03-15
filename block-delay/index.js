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
    case 'rococo-local':
      url = 'ws://127.0.0.1:9988';
      break;
    case 'spreehafen':
      url = 'wss://spreehafen.datahighway.com'; // Public Testnet
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
  // https://momentjs.com/docs/
  const fileName = `${chain.replace(/ /g, '-').toLowerCase()}-${moment(new Date()).format("YYYY-MM-DD-HH:mm-SSSSSSSSS").toString()}`;

  let count = 0;
  let lastHeader;
  let diffSec;
  fs.mkdir(`${process.cwd()}/data`, () => {});
  let dataPath = `${process.cwd()}/data/${fileName}.csv`;
  // subscribe to latest header
  const unsub = await api.rpc.chain
    .subscribeNewHeads(async (header) => {
      console.log(`${chain}: last block #${header.number} has hash ${header.hash}`);

      if (lastHeader) {
        const timestampPrev = await api.query.timestamp.now.at(lastHeader);
        const timestampNow = await api.query.timestamp.now();
        // const momentPrev = moment(timestampPrev);
        // const momentNow = moment(timestampNow);
        // console.log('momentPrev: ', moment(momentPrev).format("YYYY-MM-DD HH:mm Z").toString());
        diffSec = (timestampNow - timestampPrev)/1000;
        console.log('difference in milliseconds', timestampNow - timestampPrev);
      }
      lastHeader = header.hash;

      // too frequent to check difference in seconds
      // console.log('diff in sec', momentNow.diff(momentPrev, 'seconds', true)); // true returns as float
      console.log('count: ', count);
      console.log('current time: ', new Date());
      if (count !== 0) {
        dataRow = `${header.number},${count},${diffSec}\n`;
        fs.appendFile(dataPath, dataRow, function (err) {
          if (err) {
            return console.log(err);
          }
          console.log(`file ${fileName}.csv was updated`);
        });
      }
      count = count + 1;
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(-1);
});
