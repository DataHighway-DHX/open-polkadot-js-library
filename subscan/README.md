# Backup All Accounts from a Substrate-based blockchain using Subscan API

## Table of Contents

* [About](#about)
* [Instructions](#instructions)

## About

The Subscan API may be used to query the DataHighway's historic blockchain storage data.
A Subscan API Key may be obtained from https://docs.api.subscan.io/#introduction.

## Script

* Clone this repository

```
git clone https://github.com/DataHighway-DHX/open-polkadot-js-library
cd subscan
```

* Switch to a version of Node.js >14 (i.e. v16.3.0 works).

* Rename the file .env-sample to .env. Change its value of the key `SUBSCAN_API_KEY` from the default to instead be the Subscan API Key that you obtain, or run:
```
export SUBSCAN_API_KEY=<INSERT_SUBSCAN_API_KEY>
echo $SUBSCAN_API_KEY
```

* Change the value of the `ENDPOINT` environment variable to one of the endpoints provided by the Subscan API https://docs.api.subscan.io/#api-endpoints. For example to query the DataHighway network use the value "datahighway.api.subscan.io".
```
export ENDPOINT=<INSERT_ENDPOINT>
echo $ENDPOINT
```

* Change the value of the `METHOD` constant in the file index.js to the Request URL. For example to query the accounts https://docs.api.subscan.io/#accounts of the DataHighway network, you would use the value 'api/scan/accounts'.

* Change the `payload` (if necessary) depending on the method being used. For example Subscan's current maximum query data is 100 each time, so to query their method 'api/scan/accounts' we use a "row" value of 100 to retrieve all the accounts on each page, and we manually find out how many pages actually store data.

* Change the `DELAY` to prevent performing queries too frequently and exceeding the rate limit set by the Subscan API. For example set to 3000 to perform a query every 3 seconds. 

* Run the following:

```
yarn
node index.js 
```

* Check in the logs the `maxPages` value that was generated for sanity. For example, on the DataHighway network, if the maxPages is determined automatically to be 24, then check that this value was determined correctly by verifying there is no further data that we should be querying from further pages like the next page 25
```
curl -X POST https://datahighway.api.subscan.io/api/scan/accounts \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: <INSERT_SUBSCAN_API_KEY>' \
  --data-raw '{
    "row": 100,
    "order": "asc",
    "page": 0
  }'
```

* View the data that was retrieved and stored in a file in the ./data subdirectory

* Optionally convert all values from their Public Key (Hex) into SS58 Address equivalent.

* Change the value of the `FILENAME` environment variable to file that was generated. For example "datahighway.api.subscan.io-api-scan-accounts-2022-02-03-12:09-993000000-genesis-fixture".
* Also set the amount of tokenDecimals used by the chain in chain_spec.rs of the Substrate-based chain to `CHAIN_TOKEN_DECIMALS` ("18" is used by default if not specified)
```
export FILENAME=<INSERT_FILENAME> CHAIN_TOKEN_DECIMALS=<INSERT_CHAIN_TOKEN_DECIMALS>
echo $FILENAME $CHAIN_TOKEN_DECIMALS
```

```
yarn
node convert.js 
```

* Issue:

In the Subscan UI there's a variety of rounding down values:

37 to 18 decimal places (e.g. "partial fee", "tip", "Parameters")
37 to 16 decimal places (e.g. "balance")
37 to 15 decimal places (e.g. "transferrable")
So the values show in the UI and retrieved from the Subscan API are not to their actual precision of 37 decimal places, and instead only the rounded down values are available.

So for the purpose of a hardspoon using balances obtained from the Subscan API, each account will only be credited their account balance rounded down to 15 decimal places.

This impact should be minimal since at an exchange rate of ~US$5 per DHX, the maximum missing value per account would be ~0.000000000000000999* DHX, which is ~US$0.000000000000005.
It should still be conveyed to the community.
