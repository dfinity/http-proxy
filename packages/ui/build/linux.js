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
  linux: {
    icon: './src/assets/logo@256x256.icns',
    category: "System",
    files: [
      '!bin/http-proxy-daemon-win.exe',
      '!bin/http-proxy-daemon-win-x64.exe',
      '!bin/http-proxy-daemon-win-arm64.exe',
      '!bin/http-proxy-daemon-macos',
      '!bin/http-proxy-daemon-macos-x64',
      '!bin/http-proxy-daemon-macos-arm64',
      '!.git/*',
      '!tsconfig.json',
      '!nodemon.json',
      '!.eslintrc.js',
    ],
  },
};

const build = async () => {
  // build for linux arm
  await builder
    .build({
      targets: Platform.LINUX.createTarget('zip', builder.Arch.arm64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
  // build for linux x64
  await builder
    .build({
      targets: Platform.LINUX.createTarget('zip', builder.Arch.x64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
  // linux arm installer (non deterministic)
  await builder
    .build({
      targets: Platform.LINUX.createTarget('deb', builder.Arch.arm64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
  // linux x64 installer (non deterministic)
  await builder
    .build({
      targets: Platform.LINUX.createTarget('deb', builder.Arch.x64),
      config: options,
    })
    .then(async (builtFiles) => createReleaseHashFile(builtFiles));
};

module.exports = build;
