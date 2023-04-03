[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](../../LICENSE)

# @dfinity/http-proxy-daemon

## Overview

Background process responsible for executing tasks received from the main proxy process such as adding/removing a certificate to the device trusted store. The daemon process is also responsbile for cleaning up the system from the proxy configuration once the main process has exited.

## Setup

Build and start the `daemon` process.
```bash
yarn build
yarn start
```

Starts a `watch` process that will reload on changes.
```bash
yarn dev
```
