'use strict';

const { platform } = require('node:process');
const macBuild = require('./build/mac');
const winBuild = require('./build/win');

switch (platform) {
  case 'win32': {
    winBuild();
    break;
  }
  case 'darwin': {
    macBuild();
    break;
  }
  default: {
    throw new Error("Unsupported platform. Only Mac and Windows are currently supported.");
  }
}
