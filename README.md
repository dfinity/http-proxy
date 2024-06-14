# ICP HTTP Proxy

> This application is currently only a proof of concept implementation and should be used at your own risk.

## Overview

An implementation of the [ICP HTTP Gateway Protocol](https://internetcomputer.org/docs/current/references/ic-interface-spec/#http-gateway) that enables end-to-end secure connections with dApps being served from the [Internet Computer](https://internetcomputer.org/).

### Motivation and Goals

- Connect to the ICP network without the need for any trusted intermediaries.

- Verify HTTP responses received from the ICP network for authenticity.

- Resist censorship by bypassing traditional DNS infrastructure.

- Enable resolution of crypto domains (not implemented yet).

### Key Features

- Translate between ICP API calls and HTTP Asset Requests.

- Terminate TLS connections locally with a self-generated root certificate authority.

- Detect IC domains from principals and custom domain DNS records.

- Bypass remote HTTP gateway denylists.

### Supported Platforms

- Windows

- MacOSX

- Debian

Other platforms can also be supported by adding the generated root certificate to the device's trusted store and adding the proxy HTTP server to the active network interface configuration.

## Installation

To install the ICP HTTP Proxy, you can follow these steps:

1. Choose the appropriate installation package for your operating system:

2. Download the installation package for your operating system.

3. Run the downloaded package to start the installation process.

4. Follow the on-screen instructions to complete the installation.

5. Once the installation is complete, you can start using the ICP HTTP Proxy.

[![Install MacOS](https://img.shields.io/badge/install-MacOSX-blue.svg?style=for-the-badge&logo=apple)](https://github.com/dfinity/http-proxy/releases/download/0.0.6-alpha/ic-http-proxy-mac-universal-0.0.6-alpha.dmg)
[![Install Windows](https://img.shields.io/badge/install-Windows-blue.svg?style=for-the-badge&logo=windows)](https://github.com/dfinity/http-proxy/releases/download/0.0.6-alpha/ic-http-proxy-win-x64-0.0.6-alpha.exe)
[![Install Debian](https://img.shields.io/badge/install-Debian-blue.svg?style=for-the-badge&logo=debian)](https://github.com/dfinity/http-proxy/releases/download/0.0.6-alpha/ic-http-proxy-linux-arm64-0.0.6-alpha.deb)

## Contributing

External code contributions are not currently being accepted to this repository.

## Setup

The package manager of this monorepo is [yarn](https://yarnpkg.com/) and the applications are built for [nodejs](https://nodejs.org/en). The usage of [nvm](https://github.com/nvm-sh/nvm) is recommended to keep the node version in sync.

### Setting up dependencies

The following steps can be used to set up the proxy for local development and to package it to your system architecture.

This will set up yarn with the latest stable release.

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

The proxy graphical interface is started and added to the operating system menu bar.

```bash
yarn start
```

## Packages

This monorepo has multiple locally maintained packages in the root [package.json](package.json) configuration.

| Package  | Links                                                                                                                                     | Description                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `core`   | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/core)   | The `core` package contains a set of core features shared among other packages of this monorepo.                                       |
| `daemon` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/daemon) | A background process that receives tasks to execute against the operating system and monitors the status of the proxy server instance. |
| `server` | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/server) | The proxy server implementation the IC HTTP Gateway protocol, terminating TLS and resolving dApp domains.                              |
| `ui`     | [![README](https://img.shields.io/badge/-README-blue?style=flat-square)](https://github.com/dfinity/http-proxy/tree/main/packages/ui)     | Electron app responsible for the graphical interface.                                                                                  |
