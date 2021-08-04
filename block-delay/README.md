# Troubleshooting Block Header Delay when Querying DataHighway

## Table of Contents

* [About](#about)
* [Polkadot.js Script](#polkadot-js-script)
* [Other Troubleshooting Approaches](#other-troubleshooting-approaches)
  * [Sidecar](#sidecar)
  * [Update DataHighway](#update-datahighway)

## About

A client has reported delays in when trying update new blocks on their local server of DataHighway Westlake mainnet. It occurs when they query http://xxx:8585/blocks/head. They are reporting the dhx.api HTTP status code is not 200-299. They said they are experiencing a delay and timeout similar to this issue https://github.com/polkadot-js/api/issues/3365 every few mins. They said as a result users are not able to topup or withdraw in time. The said their node has both http and ws connections.

## Polkadot.js Script

* Switch to a version of Node.js >14

* Replace `<CHAIN>` below with the chain to connect to (i.e. `local` (for "Development" or "Local", `brickable`, `harbour`, or `westlake`). e.g. `node index.js "westlake"`
```
yarn
node index.js "<CHAIN>" 
```

* View data that is generated in subdirectory /data. The filename generated contains the chain it connected to and the date the data was produced.

Note: If you want to save the data to share then create a folder inside the existing /backup subdirectory and move the data file into that folder.

## Other Troubleshooting Approaches

### Sidecar

Run queries to endpoint /blocks/head, which interacts with DataHighway Harbour Testnet.
They were made frequently using DataHighway's Sidecar https://datahighway-dhx.github.io/substrate-api-sidecar/
All HTTP status codes were 200.

### Update DataHighway

This PR https://github.com/DataHighway-DHX/node/pull/215 was an attempt to update to the latest version of Substrate (since it was last updated to an old Substrate 3 commit dated 10th Feb 2021) incase that helps resolve the issue of delays interacting with the DataHighway Westlake mainnet, however it does not appear to have resolved the issue.

The [Polkadot.js Script](#polkadot-js-script) that subscribes to the latest block head was used to check if there was a delay in obtaining a response. The findings were as follows:

* Checked DataHighway Westlake. Run script with `node index.js "westlake"`. Blocktime should be 4.32 seconds, but sometimes it is double that amount. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/datahighway-westlake-mainnet-2021-08-04-07:38-565000000.csv.

* Checked DataHighway Harbour.  Ran script with `node index.js "harbour"`. Similar findings to Westlake. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/datahighway-harbour-testnet-2021-08-04-07:14-124000000.csv

* Checked DataHighway Local. Ran five (5) validator nodes locally. Ran `node index.js "local"`. Similar findings to Westlake and Harbour. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/local-testnet-2021-08-04-07:55-523000000.csv

* Checked DataHighway Dev. Ran one dev node with `./target/release/datahighway --dev`. Ran `node index.js "local"`. No delays encountered. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/development-2021-08-04-07:34-980000000.csv

* Checked latest [Substrate Node Template using Aura](https://github.com/substrate-developer-hub/substrate-node-template). Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime is 6 seconds. No delays encountered (even after changing to 4.32 second blocktime). Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-substrate-node-template-aura/local-testnet-2021-08-04-08:20-339000000.csv

* Checked fork of [Substrate Node Template using Babe + Grandpa](https://github.com/ltfschoen/substrate-node-template). Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime is 6 seconds. No delays encountered (even after changing to 4.32 second blocktime). Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-substrate-node-template-babe/local-testnet-2021-08-04-08:49-097000000.csv

So all DataHighway chains that are running multiple nodes and finalizing blocks are encountering this delay.
However, the Substrate Node Template does not encounter the delay.
