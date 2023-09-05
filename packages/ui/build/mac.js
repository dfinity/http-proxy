'use strict';

const { execSync } = require('child_process');
const builder = require('electron-builder');
const { createReleaseHashFile } = require('./utils');
const Platform = builder.Platform;

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const options = {
  compression: 'normal',
  removePackageScripts: true,
  appId: 'com.dfinity.ichttpproxy',
  productName: 'IC HTTP Proxy',
  executableName: 'ic-http-proxy',
  artifactName: 'ic-http-proxy-${os}-${arch}-${version}.${ext}',
  nodeVersion: 'current',
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  asarUnpack: ['node_modules/@dfinity/http-proxy-daemon/bin/*'],
  directories: {
    output: 'pkg',
  },
  afterPack: (context) => {
    execSync(
      `find "${context.appOutDir}" -exec touch -mht 202201010000.00 {} +`
    );
  },
  mac: {
    category: 'public.app-category.utilities',
    icon: './src/assets/logo@128x128.icns',
    identity: null,
    files: [
      '!bin/http-proxy-daemon-win.exe',
      '!bin/http-proxy-daemon-win-x64.exe',
      '!bin/http-proxy-daemon-win-arm64.exe',
      '!bin/http-proxy-daemon-linux',
      '!bin/http-proxy-daemon-linux-x64',
      '!bin/http-proxy-daemon-linux-arm64',
      '!.git/*',
      '!tsconfig.json',
      '!nodemon.json',
      '!.eslintrc.js',
    ],
  },
};

const build = async () => {
  // build for mac arm
  await builder
    .build({
      targets: Platform.MAC.createTarget('zip', builder.Arch.arm64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));

  // build for mac intel
  await builder
    .build({
      targets: Platform.MAC.createTarget('zip', builder.Arch.x64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
  // universal mac dmg build (non deterministic)
  await builder
    .build({
      targets: Platform.MAC.createTarget('dmg', builder.Arch.universal),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
};

module.exports = build;
