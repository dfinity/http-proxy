'use strict';

const crypto = require('crypto');
const fs = require('fs');

const hashReleaseFile = (releaseFiles) => {
  const [releaseFile] = releaseFiles.filter((file) => !file.endsWith('.blockmap'));

  const buffer = fs.readFileSync(releaseFile);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  
  const hash = hashSum.digest('hex');

  return { file: releaseFile, hash };
};

const createReleaseHashFile = (releaseFiles) => {
  const result = hashReleaseFile(releaseFiles);

  fs.writeFileSync(`${result.file}.sha256.txt`, result.hash);
};

module.exports = { hashReleaseFile, createReleaseHashFile };
