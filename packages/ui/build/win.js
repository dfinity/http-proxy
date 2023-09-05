'use strict';

const builder = require('electron-builder');
const { createReleaseHashFile } = require('./utils');
const { execSync, exec } = require('child_process');
const { resolve } = require('path');
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
  executableName: 'ic-http-proxy',
  artifactName: 'ic-http-proxy-${os}-${arch}-${version}.${ext}',
  nodeVersion: 'current',
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  asarUnpack: ['node_modules/@dfinity/http-proxy-daemon/bin/*'],
  directories: {
    output: 'pkg',
  },
  afterSign: async (context) => {
    execSync(
      `& "${resolve(__dirname, 'win.ps1')}" "${context.appOutDir}"`, {
        env: process.env,
        shell: 'powershell.exe'
      }
    );
  },
  win: {
    icon: './src/assets/logo@128x128.ico',
    files: [
      '!bin/http-proxy-daemon-macos',
      '!bin/http-proxy-daemon-macos-x64',
      '!bin/http-proxy-daemon-macos-arm64',
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
