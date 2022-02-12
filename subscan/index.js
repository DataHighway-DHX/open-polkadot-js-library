require('dotenv').config();
const axios = require('axios').default;
const moment = require('moment');
const fs = require('fs');
const { u8aToHex } = require('@polkadot/util');
const { decodeAddress } = require('@polkadot/util-crypto');

const sleep = (delay) => {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay);
  });
}

async function req(api_key, endpoint, method, payload) {
  const options = {
    method: "POST",
    url: "https://" + endpoint + "/" + method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': api_key
    },
    data: payload,
  };

  const res = await axios(options);

  // throttle to Subscan rate limits of the API key
  // as currently there is no api key to support 2 queries per second
  const DELAY = 3000; // milliseconds
  await sleep(DELAY);

  if (res.status === 200) {
    return res.data;
  } else {
    throw new Error(`Got error response: ${res.data}`);
  }
}

async function query(api_key, endpoint, method, payload) {
  const response = await req(api_key, endpoint, method, payload);

  return response;
}

// reference/credits: Shawn Tabrizi https://github.com/ltfschoen/substrate-js-utilities/blob/master/utilities.js#L67
function accountSS58ToPublicKeyHex(addressSS58) {
  let addressPublicKeyHex;
  try {
    addressPublicKeyHex = u8aToHex(decodeAddress(addressSS58));
  } catch (e) {
    throw new Error(`Unable to convert u8a to hex for decoded SS58 address {e}`);
  }
  return addressPublicKeyHex;
}

async function main () {
  // obtain a Subscan API Key from https://docs.api.subscan.io/#introduction
  const SUBSCAN_API_KEY = process.env.SUBSCAN_API_KEY;
  const ENDPOINT = process.env.ENDPOINT;
  const METHOD = 'api/scan/accounts';

  // fetch data
  const resAccounts = {
    "accounts": []
  };
  // it is necessary to manually check what TODO: change to 24 since we determined that pages 0 to 24 have accounts
  let maxPages = 0;
  let maxQueryData = 100;
  let payload = {
    // Subscan's current maximum query data is 100 each time
    "row": maxQueryData,
    "order": "asc",
    "page": maxPages
  };
  let resCount;
  let res1, res2;

  // initially just find out what the maxPages is so we know how many pages to loop through automatically
  res1 = await query(SUBSCAN_API_KEY, ENDPOINT, METHOD, payload);
  if (typeof resCount == 'undefined') {
    resCount = res1.data.count;
    console.log('accounts available from API: ', resCount);
    maxPages = Math.floor(resCount / maxQueryData);
  }

  // loop through all the pages and query the available data from the API
  for (let page = 0; page <= maxPages; page++) {
    payload["page"] = page;

    res2 = await query(SUBSCAN_API_KEY, ENDPOINT, METHOD, payload);
    // console.dir(res, {depth: 3});

    console.log(`processing page: ${page} of ${maxPages} that has rows: ${res2.data.list.length}`);

    for (const acct in res2.data.list) {
      // console.log(`${acct}: ${res.data.list[acct]}`);

      // verify that all the accounts on the next page is unique
      // or just detect and flag if a duplicate accounts was retrieved
      const index = resAccounts["accounts"].findIndex(item => item.address === acct);
      if (index != -1) {
        throw new Error(`Duplicate account detected when trying to add accounts: ${acct}`);
      }

      resAccounts["accounts"].push(res2.data.list[acct]);
    }
  }
  // console.log("resAccounts: ", resAccounts["accounts"]);

  // restructure into a new .json file with an outer "balances" key whose value is
  // an array of arrays where each has two elements, including the public key of the
  // account to be credited and the amount to be credited.
  // see https://github.com/DataHighway-DHX/DataHighway-Parachain/pull/5/files#diff-03ba6e560e063bae9ad8da38df998bafd6ac9c236bc8fed1ac6d610f01d1778dR1
  let genesisObj = {
    "balances": []
  };
  let balanceObj, publicKeyHex, publicKeyHexStripped, accountPublicKey, accountBalance;

  // use 'for of' loop since maybe order is important for cross checking
  for (const acct of resAccounts["accounts"]) {
    // console.log(`${acct["address"]}: ${acct["balance"]}`);

    balanceObj = [];

    // convert SS58 address that we retrieved to Public Key (hex) but without the '0x' prefix
    // - https://datahighway.subscan.io/tools/format_transform
    // - https://github.com/shawntabrizi/substrate-js-utilities/blob/master/utilities.js#L67

    publicKeyHex = accountSS58ToPublicKeyHex(String(acct["address"]));
    publicKeyHexStripped = publicKeyHex.replace(/^0x/, '');
    // console.log('publicKeyHexStripped: ', publicKeyHexStripped);

    accountPublicKey = publicKeyHexStripped;
    accountBalance = acct["balance"];
    balanceObj.push(accountPublicKey);
    balanceObj.push(accountBalance);
    genesisObj["balances"].push(balanceObj);
  }
  // console.log("genesisObj: ", genesisObj);

  // serialize the retrieved and modified data to JSON and store in file
  // format output indentation with 4 spaces
  const genesisObjSerialized = JSON.stringify(genesisObj, undefined, 4);

  console.log('saving accounts at current time: ', new Date());
  // https://momentjs.com/docs/
  // we'll add "-genesis-fixture" at the end of the filename if we've modified the
  // retrieved data to make it compatible for importing it as a genesis.json file fixture
  const fileName = `${ENDPOINT}-${METHOD.replace(/\//g, '-').toLowerCase()}-${moment(new Date()).format("YYYY-MM-DD-HH:mm-SSSSSSSSS").toString()}-genesis-fixture`;

  fs.mkdir(`${process.cwd()}/data`, () => {});
  let dataPath = `${process.cwd()}/data/${fileName}.json`;

  // write accounts to a file
  fs.appendFile(dataPath, genesisObjSerialized, function (err) {
    if (err) {
      return console.log("error writing accounts to file", err);
    }
    console.log(`saved accounts to file ${dataPath}`);

    // verify able to read data that was stored
    let data, dataParsedJSON;
    try {
      data = fs.readFileSync(`${process.cwd()}/data/${fileName}.json`, 'utf8');
      dataParsedJSON = JSON.parse(data);
    } catch (err) {
      console.log(`Error reading file: ${err}`);
    }
    console.log('page numbers processed: ', maxPages);
    console.log('accounts available from API: ', resCount);
    console.log('accounts processed: ', dataParsedJSON["balances"].length);
    if (dataParsedJSON["balances"].length == resCount) {
      console.log("Successfully verified that correct amount of accounts were stored");
    } else {
      console.error("incorrect number of accounts stored. please check that all relevant pages were processed!");
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(-1);
});
