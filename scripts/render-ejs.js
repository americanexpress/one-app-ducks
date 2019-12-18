#!/usr/bin/env node
/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,either express
 * or implied. See the License for the specific language governing permissions and limitations
 * under the License.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const ejs = require('ejs');
const mkdirp = promisify(require('mkdirp'));

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const lstat = promisify(fs.lstat);

function readFiles(entryName) {
  return lstat(entryName)
    .then((stats) => {
      if (!stats.isDirectory()) {
        return readFile(entryName, 'utf-8');
      }
      return readdir(entryName)
        .then((subEntryNames) => {
          const subEntries = {};
          const promises = [];
          subEntryNames.forEach((fileName) => {
            promises.push(
              readFiles(path.join(entryName, fileName))
                .then((entryValue) => { subEntries[fileName] = entryValue; })
            );
          });
          return Promise.all(promises).then(() => subEntries);
        });
    });
}

function writeFiles(files, dir) {
  const dirname = dir || '';
  mkdirp(path.join(__dirname, '../lib', dirname)).then(() => {
    Object.keys(files).forEach((fileName) => {
      if (typeof files[fileName] === 'object') {
        writeFiles(files[fileName], path.join(dirname, fileName));
      } else {
        fs.unlinkSync(path.join(__dirname, '../lib', dirname, fileName));
        writeFile(
          path.join(__dirname, '../lib', dirname, fileName.replace(/\.ejs$/, '.js')),
          files[fileName],
          'utf-8'
        );
      }
    });
  });
}

function renderEjs(files) {
  const fileNames = Object.keys(files);
  const renderedFiles = {};

  fileNames.forEach((fileName) => {
    const file = files[fileName];
    if (typeof file === 'object') {
      renderedFiles[fileName] = renderEjs(file);
    } else if (/\.ejs$/.test(fileName)) {
      renderedFiles[fileName] = ejs.render(files[fileName], { require, process });
    } else {
      renderedFiles[fileName] = file;
    }
  });

  return renderedFiles;
}

readFiles(path.join(__dirname, '../lib'))
  .then(renderEjs)
  .then(writeFiles);
