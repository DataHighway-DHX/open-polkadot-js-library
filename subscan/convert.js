const moment = require('moment');
const fs = require('fs');
const { encodeAddress } = require('@polkadot/util-crypto');
const { assert } = require('@polkadot/util');
const BigNumber = require('bignumber.js');

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

// Since we need to generate a .json file that doesn't contain values with decimal places
// for importing accounts into genesis here https://github.com/DataHighway-DHX/DataHighway-Parachain/pull/5/commits/f4d274ef2b20cb62e43eede8f184d143cfa9f2cd
// If the original value was 18.400991637728733, and the tokenDecimals defined in the relevant
// chain_spec.rs file of the Substrate based chain is 18, then we need to change the
// value so it has extra 0's at the end so it has 18 decimal places instead of only 15, and
// then remove the decimal point.
// Note: We don't use something like `> 123.456789.toFixed(18) because the output ends up like
// '123.456789000000000556'`
function getNewBalanceForTokenDecimals(existingBalanceVal, chainTokenDecimals) {
  let tempExistingBalanceValBigNumber = new BigNumber(existingBalanceVal);
  // where EXISTENTIAL_DEPOSIT is 1000000000000000 in the blockchain configuration, which is 0.001 DHX,
  // we need all imported accounts to have at least that balance, but some of them don't, so an error will
  // occur when you try to export-genesis-state `the balance of any account should always be at least the existential deposit`,
  // so boost their balance to the EXISTENTIAL_DEPOSIT if they have less balance than it.
  if (tempExistingBalanceValBigNumber.isLessThan(0.001)) {
    tempExistingBalanceValBigNumber = new BigNumber(0.001);
  }
  tempExistingBalanceValBigNumber = tempExistingBalanceValBigNumber.toString();
  console.log('existingBalanceVal: ', existingBalanceVal)
  console.log('tempExistingBalanceValBigNumber: ', tempExistingBalanceValBigNumber)
  let currentDecimals = tempExistingBalanceValBigNumber.length - (tempExistingBalanceValBigNumber.indexOf('.') + 1);
  let extraRequired = chainTokenDecimals - currentDecimals;
  let newStrWithoutDecimal = tempExistingBalanceValBigNumber.concat("0".repeat(extraRequired)).replace('.', '');
  return newStrWithoutDecimal;
}

async function main () {
  assert(getNewBalanceForTokenDecimals("123.456789", 18) == "123456789000000000000", "failed balance conversion test");
  const FILENAME = process.env.FILENAME;
  let CHAIN_TOKEN_DECIMALS = process.env.CHAIN_TOKEN_DECIMALS || 18;

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
  let existingBalanceVal;
  let genesisVec = [];
  let totalIssuanceBackup = new BigNumber("0".toString());
  let newBalanceValBigNumber;
  for (let accountIndex = 0; accountIndex <= maxBalances - 1; accountIndex++) {
    accountPublicKey = dataParsedJSON["balances"][accountIndex][0];
    // console.log('accountPublicKey: ', accountPublicKey);
    ss58ForPublicKey = accountPublicKeyToSS58(accountPublicKey);

    existingBalanceVal = String(dataParsedJSON["balances"][accountIndex][1]);
    // count amount of numbers after the decimal place in the string,
    // add more 0's at the end so there are 18 of them if the chain has 18 tokenDecimals.
    // then remove the decimal point from the string
    newBalanceVal = getNewBalanceForTokenDecimals(existingBalanceVal, CHAIN_TOKEN_DECIMALS);

    newAccount = [
      ss58ForPublicKey,
      newBalanceVal,
    ];
    newBalanceValBigNumber = new BigNumber(newBalanceVal);
    if (newBalanceValBigNumber != undefined) {
      totalIssuanceBackup = totalIssuanceBackup.plus(newBalanceValBigNumber);
    }
    console.log(totalIssuanceBackup.toString());

    genesisVec.push(newAccount);
  }
  console.log("genesisVec: ", genesisVec);
  console.log("totalIssuanceBackup: ", totalIssuanceBackup.toString());

  // serialize the modified data to JSON and store in file
  // format output indentation with 4 spaces
  const genesisVecSerialized = JSON.stringify(genesisVec, undefined, 4);

  console.log('saving accounts at current time: ', new Date());
  // https://momentjs.com/docs/
  // we'll add "-genesis-fixture-converted" at the end of the filename if we've modified the
  // retrieved data to make it compatible for importing it as a genesis.json file fixture
  // and converted the public key hex into an SS58 account address
  const newFileName = `${FILENAME}-${moment(new Date()).format("YYYY-MM-DD-HH:mm-SSSSSSSSS").toString()}-genesis-fixture-converted`;

  // fs.mkdir(`${process.cwd()}/data`, () => {});
  let dataPath = `${process.cwd()}/data/${newFileName}.json`;

  // write accounts to a file
  fs.appendFile(dataPath, genesisVecSerialized, function (err) {
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
    console.log('accounts processed: ', dataParsedJSON.length);
    if (dataParsedJSON.length == maxBalances) {
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
