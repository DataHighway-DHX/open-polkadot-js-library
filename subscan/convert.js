const moment = require('moment');
const fs = require('fs');
const { encodeAddress } = require('@polkadot/util-crypto');

// reference/credits: Shawn Tabrizi https://github.com/ltfschoen/substrate-js-utilities/blob/master/utilities.js#L67
function accountPublicKeyToSS58(accountPublicKey) {
  let accountSS58;
  let ss58FormatDataHighway = 33;
  try {
    accountSS58 = String(encodeAddress(`0x${accountPublicKey}`, ss58FormatDataHighway));
    console.log('encoded pub key to SS58: ', accountPublicKey, accountSS58);
  } catch (e) {
    throw new Error(`Unable to convert public key hex to SS58 address {e}`);
  }

  return accountSS58;
}

async function main () {
  const FILENAME = process.env.FILENAME;

  // verify able to read data that was stored
  let data, dataParsedJSON;
  try {
    data = fs.readFileSync(`${process.cwd()}/data/${FILENAME}.json`, 'utf8');
    dataParsedJSON = JSON.parse(data);
  } catch (err) {
    console.log(`Error reading file: ${err}`);
  }
  // console.log('accounts available: ', dataParsedJSON["balances"].length);

  let maxBalances = dataParsedJSON["balances"].length;
  
  let accountPublicKey;
  let newAccount;
  let ss58ForPublicKey;
  let genesisObj = {
    "balances": []
  };
  for (let accountIndex = 0; accountIndex <= maxBalances - 1; accountIndex++) {
    accountPublicKey = dataParsedJSON["balances"][accountIndex][0];
    // console.log('accountPublicKey: ', accountPublicKey);
    ss58ForPublicKey = accountPublicKeyToSS58(accountPublicKey);
    newAccount = [
      ss58ForPublicKey,
      dataParsedJSON["balances"][accountIndex][1],
    ];
    genesisObj["balances"].push(newAccount);
  }
  console.log("genesisObj: ", genesisObj);

  // serialize the modified data to JSON and store in file
  // format output indentation with 4 spaces
  const genesisObjSerialized = JSON.stringify(genesisObj, undefined, 4);

  console.log('saving accounts at current time: ', new Date());
  // https://momentjs.com/docs/
  // we'll add "-genesis-fixture-converted" at the end of the filename if we've modified the
  // retrieved data to make it compatible for importing it as a genesis.json file fixture
  // and converted the public key hex into an SS58 account address
  const newFileName = `${FILENAME}-${moment(new Date()).format("YYYY-MM-DD-HH:mm-SSSSSSSSS").toString()}-genesis-fixture-converted`;

  // fs.mkdir(`${process.cwd()}/data`, () => {});
  let dataPath = `${process.cwd()}/data/${newFileName}.json`;

  // write accounts to a file
  fs.appendFile(dataPath, genesisObjSerialized, function (err) {
    if (err) {
      return console.log("error writing accounts to file", err);
    }
    console.log(`saved accounts to file ${dataPath}`);

    // verify able to read data that was stored
    let data, dataParsedJSON;
    try {
      data = fs.readFileSync(`${process.cwd()}/data/${newFileName}.json`, 'utf8');
      dataParsedJSON = JSON.parse(data);
    } catch (err) {
      console.log(`Error reading file: ${err}`);
    }
    console.log('accounts processed: ', dataParsedJSON["balances"].length);
    if (dataParsedJSON["balances"].length == maxBalances) {
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
