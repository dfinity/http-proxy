[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](../../LICENSE)

# @dfinity/http-proxy-ui

## Overview

Graphical interface that facilitates the usage of the proxy within the supported operating systems. The interface will create a `menubar` added to the system that shows the current status of the proxy and adds a `start/stop` capability. 

## Setup

Build and start the `ui`.
```bash
yarn build
yarn start
```

Starts a `watch` process that will reload on changes.
```bash
yarn dev
```

## Packaging

Generates the bundle of the application that can be installed natively in the supported operating systems.

```bash
yarn pkg
```
