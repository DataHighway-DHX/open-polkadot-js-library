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

* Change the value of the `ENDPOINT` constant in the file index.js to one of the endpoints provided by the Subscan API https://docs.api.subscan.io/#api-endpoints. For example to query the DataHighway network use the value "datahighway.api.subscan.io".

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

