[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](../../LICENSE)

# @dfinity/http-proxy-server

## Overview

Proxy server implementing the IC HTTP Gateway protocol that detects if a domain is serving a dApp from the internet computer and handles the conversion between API calls and HTTP Asset Requests while performing response verification locally.

The proxy can also resolve crypto custom domains to it's respective canister id if provided [here](src/servers/icp/static.ts).

## Setup

Build and start the `server` process.
```bash
yarn build
yarn start
```

Starts a `watch` process that will reload on changes.
```bash
yarn dev
```
