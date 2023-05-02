'use strict';

const builder = require('electron-builder');
const Platform = builder.Platform;

// Let's get that intellisense working
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const options = {
  // "store” | “normal” | "maximum". - For testing builds, use 'store' to reduce build time significantly.
  compression: 'normal',
  removePackageScripts: true,
  appId: 'com.dfinity.ichttpproxy',
  productName: 'IC HTTP Proxy',
  nodeVersion: 'current',
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  asarUnpack: ['node_modules/@dfinity/http-proxy-daemon/bin/*'],
  directories: {
    output: 'pkg',
  },
  win: {
    icon: './src/assets/logo@128x128.ico',
    files: [
      '!bin/http-proxy-daemon-macos',
      '!.git/*',
      '!tsconfig.json',
      '!nodemon.json',
      '!.eslintrc.js',
    ],
  },
};

const build = async () => {
  // windows zip
  await builder
    .build({
      targets: Platform.WINDOWS.createTarget('zip', builder.Arch.x64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
  // windows installer (non deterministic)
  await builder
    .build({
      targets: Platform.WINDOWS.createTarget('nsis', builder.Arch.x64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
};

module.exports = build;
