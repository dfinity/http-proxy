[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)
[![GitHub license](https://img.shields.io/badge/install-MacOSX-blue.svg?style=for-the-badge&logo=apple)](https://github.com/dfinity/http-proxy/releases/download/untagged-28019e5d47da4e6cdfea/ic-http-proxy-0.0.1-mac-arm64.dmg)
[![GitHub license](https://img.shields.io/badge/install-Windows-blue.svg?style=for-the-badge&logo=windows)](https://github.com/dfinity/http-proxy/releases/download/untagged-28019e5d47da4e6cdfea/ic-http-proxy-0.0.1-win-64.exe)

# IC HTTP Proxy
> This application is a Proof of concept.

## Overview

An implementation of the [IC HTTP Gateway Protocol](https://internetcomputer.org/docs/current/references/ic-interface-spec/#http-gateway) that enables end-to-end secure connections with dApps being served from the [Internet Computer](https://internetcomputer.org/).

### Motivation and Goals

* Local alternative that implements the HTTP Gateway Protocol

* Perform response verification

* Censorship resistance

* Enable crypto domains

### Key Features

* Translates between IC API calls and HTTP Asset Requests

* Terminates TLS connection locally with self Root Authority

* Detects IC domains from principals and custom domain DNS records

* Bypasses remote gateway denylists

* Resolves crypto domains

### Supported Platforms

* Windows

* MacOSX

Other platforms can also be supported by adding the generated root certificate to the device trusted store and adding the proxy HTTP server to the active network interface configuration.

## Setup

The package manager of this monorepo is [yarn](https://yarnpkg.com/) and the applications are built for [nodejs](https://nodejs.org/en). The usage of [nvm](https://github.com/nvm-sh/nvm) is recommended to keep the node version in sync.

### Setting up dependencies

The following steps can be used to setup the proxy for local development and to package it to your system architecture.

This will setup yarn with the latest stable release.
```bash
corepack enable
corepack prepare yarn@3.5.0 --activate
```

Yarn can also be enabled through `npm`.
```
npm install --global yarn
yarn set version 3.5.0
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

The proxy graphical interface is started and added to the operating system menubar.
```bash
yarn start
```

## Packages

This monorepo has multiple locally maintained packages in the root [package.json](package.json) configuration.

| Package | Links | Description |
|---|---|---|
| `core` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/core) | The `core` package contains a set of core features shared among other packages of this monorepo. |  
| `daemon` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/daemon) | A background process that receives tasks to execute against the operating system and monitors the status of the proxy server instance. |  
| `server` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/server) | The proxy server implementation the IC HTTP Gateway protocol, terminating TLS and resolving dApp domains. |
| `ui` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/ui) | Electron app responsible for the graphical interface. |
