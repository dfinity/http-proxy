[![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](../../LICENSE)

# @dfinity/http-proxy-core

## Overview

Core utilities and shared configuration to be used within the monorepo.

## Setup

Starts a `watch` process that will reload on changes.
```bash
yarn dev
```

## Features

### Logger

Exposes a logger helper that helps format and stantardize logs across the different packages.

```typescript
// Initializes the logger with the correct context
import { initLogger } from '@dfinity/http-proxy-core';
initLogger('IC HTTP Proxy Server', 'proxy');

// use this logger across all packages
import { logger } from '@dfinity/http-proxy-core';

logger.info('logger is ready');
```

The `initLogger` function should be executed in your entrypoint.

### TLS Certificates

Handles the creation of tls certificates.

```typescript
const certificateFactory = await CertificateFactory.build(certificate: {
  storage: {
    folder: 'certs',
    hostPrefix: 'host',
  },
  rootca: {
    commonName: 'IC HTTP Proxy Root Authority',
    organizationName: 'IC HTTP Proxy',
    organizationUnit: 'IC',
  },
});

// create a new certificate for the certificate authority
const rootCA = await certificateFactory.create({ type: 'ca' });

// creates a new certificate for the given hostname that is signed with the given CA
const hostCertificate = await certificateFactory.create({
  type: 'domain',
  hostname: 'localhost',
  ca: rootCA,
});
```

### IPC

Facilitates communication across different processes.

```typescript
// server
import { IPCServer } from '@dfinity/http-proxy-core';

const ipcServer = await IPCServer.create({
  path: '/tmp/server.sock',
  onMessage: async (event: EventMessage): Promise<MessageResponse> => {
    // process the message and return a response to the client
  },
});

// client
import { IPCClient } from '@dfinity/http-proxy-core';

const ipcClient = new IPCClient({ path: '/tmp/server.sock' });
ipcClient.sendMessage({ type: 'your-message' }).then((response) => {
  // do something with the response
});
```
