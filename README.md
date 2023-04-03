[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
![GitHub license](https://img.shields.io/badge/support-windows,%20macosx-blue.svg?style=flat-square)

# IC HTTP Proxy

## Overview

An implementation of the IC HTTP Gateway Protocol that enables end-to-end secure connections with dApps being served from the internet computer.

### Motivation and Goals

* Local alternative that implements the HTTP Gateway Protocol

* Perform response verification

* Censorship resistance

* Enable crypto domains

### Key Features

* Translates between IC API calls and HTTP Asset Requests

* Terminates TLS connection with self Root Authority

* IC domain detection from principals and custom domain DNS records

* Bypasses remote gateway denylists

* Can resolve crypto domains

### Supported Platforms

* Windows

* MacOSX

Other platforms could also be supported if the user would add the generated root certificate to the device trusted store and add the proxy HTTP server to the active network interface configuration.

## Packages

This monorepo has multiple locally maintained packages in the root [package.json](package.json) configuration.

| Package | Links | Description |
|---|---|---|
| `core` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy-poc/tree/main/packages/core) | The `core` package contains a set o core features shared among other packages of this monorepo. |  
| `daemon` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy-poc/tree/main/packages/daemon) | A background process that can received tasks to execute against the operating system and monitor the status of the proxy server instance. |  
| `server` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy-poc/tree/main/packages/server) | The proxy server implementation the IC HTTP Gateway protocol, terminating TLS and resolving dApp domains. |
| `ui` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy-poc/tree/main/packages/ui) | Electron app responsible for the graphical interface. |

## Requirements

The package manager of this monorepo is [yarn](https://yarnpkg.com/) and the applications are built for [nodejs](https://nodejs.org/en). The usage of [nvm](https://github.com/nvm-sh/nvm) is recommended to keep the node version in sync.

### Setting up dependencies

The following steps can be used to setup the proxy for local development and to package it to your system architecture.

This will setup yarn with the latest stable release.

```bash
corepack enable && corepack prepare yarn@stable --activate
```

All dependencies can be installed with a single install command from the root of the monorepo.
```bash
yarn install
```

A recursive build is triggered for all of the `monorepo` packages.
```bash
yarn build
```

Produces the required binaries and installation bundles for the supported platforms.
```bash
yarn pkg
```
