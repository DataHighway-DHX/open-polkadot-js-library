# Backup Account Balances at specific Block

## Table of Contents

* [About](#about)
* [Polkadot.js Script](#polkadot-js-script)

## About

A requirement to backup account balances at a specific block.

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