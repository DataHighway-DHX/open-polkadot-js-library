require('dotenv').config();
const axios = require('axios').default;
const moment = require('moment');
const fs = require('fs');

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

async function main () {
  // obtain a Subscan API Key from https://docs.api.subscan.io/#introduction
  const SUBSCAN_API_KEY = process.env.SUBSCAN_API_KEY;
  const ENDPOINT = 'datahighway.api.subscan.io';
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

  // serialize the retrieved data to JSON and store in file
  const resAccountsSerialized = JSON.stringify(resAccounts);

  // console.log("resAccounts: ", resAccounts["accounts"]);

  console.log('saving accounts at current time: ', new Date());
  // https://momentjs.com/docs/
  const fileName = `${ENDPOINT}-${METHOD.replace(/\//g, '-').toLowerCase()}-${moment(new Date()).format("YYYY-MM-DD-HH:mm-SSSSSSSSS").toString()}`;

  fs.mkdir(`${process.cwd()}/data`, () => {});
  let dataPath = `${process.cwd()}/data/${fileName}.json`;

  // write accounts to a file
  fs.appendFile(dataPath, resAccountsSerialized, function (err) {
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
    console.log('accounts processed: ', dataParsedJSON["accounts"].length);
    if (dataParsedJSON["accounts"].length == resCount) {
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
