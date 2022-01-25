# Troubleshooting Block Header Delay when Querying DataHighway

## Table of Contents

* [About](#about)
* [Polkadot.js Script](#polkadot-js-script)
* [Other Troubleshooting Approaches](#other-troubleshooting-approaches)
  * [Sidecar](#sidecar)
  * [Update DataHighway](#update-datahighway)
  * [Root Cause](#root-cause)

## About

A client has reported delays in when trying update new blocks on their local server of DataHighway Westlake mainnet. It occurs when they query http://xxx:8585/blocks/head. They are reporting the dhx.api HTTP status code is not 200-299. They said they are experiencing a delay and timeout similar to this issue https://github.com/polkadot-js/api/issues/3365 every few mins. They said as a result users are not able to topup or withdraw in time. The said their node has both http and ws connections.

The following approaches were used to try to replicate and troubleshoot the issue.

## Polkadot.js Script

* Switch to a version of Node.js >14

* Replace `<CHAIN>` below with the chain to connect to (i.e. `local` (for "Development" or "Local", `brickable`, `harbour`, or `westlake`). e.g. `node index.js "westlake"`

```
yarn
node index.js "<CHAIN>" 
```

* Replace contents of ./custom_types.json with the custom types for the blockchain used, OR replace the contents of ./custom_types.js depending on the format they are provided in. See https://polkadot.js.org/docs/api/start/types.extend#extension

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

A) Checked DataHighway Westlake. Run script with `node index.js "westlake"`. Blocktime should be 4.32 seconds, but sometimes it is double that amount. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/datahighway-westlake-mainnet-2021-08-04-07:38-565000000.csv.

B) Checked DataHighway Harbour.  Ran script with `node index.js "harbour"`. Similar findings to Westlake. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/datahighway-harbour-testnet-2021-08-04-07:14-124000000.csv

C) Checked DataHighway Local. Ran five (5) validator nodes locally. Ran `node index.js "local"`. Similar findings to Westlake and Harbour. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/local-testnet-2021-08-04-07:55-523000000.csv

D) Checked DataHighway Local (after converting from Babe to Aura in branch 'luke/MMD-1309/update-substrate-3-convert-babe-to-aura' commit 75d282bda06550444689905045a444239dd76747). Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime should be 4.32 seconds, but every 5th block it is ~8.64 seconds. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway-aura/local-testnet-2021-08-10-09:52-891000000.csv

Update 17th Aug 2021: If the initial authorities 3-5 for "local" in chain_spec.rs are removed, then when 5 validators (i.e. Alice, ..., Eve) are run there is no delay.

D-1) Checked DataHighway Brickable (after converting from Babe to Aura in branch 'luke/MMD-1309/update-substrate-3-convert-babe-to-aura' commit 75d282bda06550444689905045a444239dd76747). Remove old data with `rm -rf /tmp/polkadot-chains`. Removed the initial authorities 3-5 for "brickable" from chain_spec.rs. Rebuilt with `cargo build --release`. Ran the five (5) validator nodes locally that we'd removed from chain_spec.rs. Inserted their session keys for Babe and Aura. Restarted all of the nodes so it finalized blocks. Ran `node index.js "local"`. Blocktime was 4.32 seconds with no delay.

E) Checked DataHighway Dev. Ran one dev node with `./target/release/datahighway --dev`. Ran `node index.js "local"`. No delays encountered. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-datahighway/development-2021-08-04-07:34-980000000.csv

F) Checked latest [Substrate Node Template using Aura](https://github.com/substrate-developer-hub/substrate-node-template). Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime is 6 seconds. No delays encountered (even after changing to 4.32 second blocktime). Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-substrate-node-template-aura/local-testnet-2021-08-04-08:20-339000000.csv

G) Checked fork of [Substrate Node Template using Babe + Grandpa](https://github.com/ltfschoen/substrate-node-template) and used branch 'luke/staking', which has been converted to Babe + Grandpa. Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime varied up to 6x what was specified in the runtime config. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-substrate-node-template-babe/local-testnet-2021-08-09-10:33-291000000.csv

H) Checked latest Substrate. Ran five (5) validator nodes locally. Ran `node index.js "local"`. Blocktime is 6 seconds. No delays encountered. Responses stored in /DataHighway-DHX/open-polkadot-js-library/block-delay/backup/data-substrate-babe/local-testnet-2021-08-04-12:47-879000000.csv

So all DataHighway chains that are running multiple nodes and finalizing blocks are encountering this delay.
However, the Substrate Node Template does not encounter the delay.

So I tried re-creating the DataHighway codebase bit by bit by adding bits of its codebase to a fork of the Substrate Node Template, as explained below. 

I) Forked the (1) [Substrate Node Template using Aura](https://github.com/substrate-developer-hub/substrate-node-template) (which didn't have and progressively any delay) into the (2) DataHighway Github at [DataHighway's Fork of Substrate Node Template using Aura](https://github.com/DataHighway-DHX/substrate-node-template) and created branch 'luke/MMD-1309/add-datahighway-until-find-delay', and used (3) [DataHighway Node repo](https://github.com/DataHighway-DHX/node) branch 'luke/MMD-1309/update-substrate-3-convert-babe-to-aura' (converted from Babe to Aura) but has the delay issue. Used Substrate commit '4d28ebeb8b027ca0227fe7779c5beb70a7b56467' dependencies in both repositories. Then progressively added bits of codebase from (3) to (2) until the delay occurred to pinpoint the cause.  
The delay was encountered when the DataHighway changes to node/src/chain_spec.rs were applied, so the issue was caused in that file. In the chain specification for the "local" network we listed 6x initial authorities as Alice, Bob, Charlie, Dave, Eve, and Ferdie, whereas the default Substrate Node Template only had 2x initial authorities as Alice and Bob.  The delay was actually happening when we were running 5x authorities (since 5x authorities is the min. required before it starts finalising blocks), but since it was expecting the 6x initial authorities defined in the chain spec and we were only running 5x, it was generating a delay.

After running I removed Ferdie from the "local" network chain spec so there were only 5x initial authorities in it. If I had 5x initial authorities in the "local" network chain spec, and started running the chain with that minimum of 5x authorities running so it finalised blocks:
  * Then each block would be separated by the `MILLISECS_PER_BLOCK` blocktime.
  * But then if I reduced to running only 4x authorities, then every 4th block the blocktime would be delayed (by double the `MILLISECS_PER_BLOCK` blocktime that we had defined for the runtime), but it would keep finalising blocks
  * But then if I reduced to running only 3x authorities, then every 3rd block the blocktime would be delay (by triple the `MILLISECS_PER_BLOCK`), and it would stop finalising blocks.
  * But then if I reduced to running only 2x authorities, then every 2nd block the blocktime would be delay (by quadruple the `MILLISECS_PER_BLOCK`), and it would stop finalising blocks.
  * No blocks would be produced if only 1x authority was running.

So if we switch to branch 'luke/MMD-1309/update-substrate-3' of 3) to see how the delays compare when using Babe instead. With Babe, we need at least 5x validators to finalize blocks, and if we are running less than 3x validators then no new blocks are generated. See backup/data-datahighway/local-testnet-2021-08-12-Babe-with-2-to-6-validators.csv

So now that we know the pattern of delay and how it depends on the amount of initial authorities vs how many are actually running, we can see what pattern it corresponds to on Westlake mainnet by running the following script at the same time https://github.com/DataHighway-DHX/open-polkadot-js-library/tree/main/block-delay

But I'm not sure what the Babe pattern means or suggests we should do other than to run more authorities than amount of authorities listed in the chain spec, but I'm not sure how many are required. So another alternative is to convert from Babe to Aura so we know.

When using Babe I tried running two more custom validators (Gerald, Herbert) and inserted their keys (in addition to the six running by default Alice, Bob, Charlie, Dave, Eve, Ferdie), but there were still delays.
Worth noting is that when I switched to Babe on the same blockchain I had also added use of ImOnline and Authority Discovery, which I wasn't using when using Aura, so I'm going to try using Babe again but after removing ImOnline and Authority Discovery to see if that's causing the issue.

### Root Cause

The root cause was identified as being due to I) mentioned above.

