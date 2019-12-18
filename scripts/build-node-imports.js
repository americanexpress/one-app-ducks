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


// Keep asynchronous dependency loading behavior consistent in both the client
// and server source files

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

function buildNodeImports(err, filePaths) {
  const fileTransforms = filePaths.map(async (filePath) => {
    const fileContents = await readFile(filePath);
    const newContents = fileContents.toString()
      .replace(/^\n/, 'const nodeImport = (path) => Promise.resolve(require(path));\n')
      .replace(/import\(([^)]+)\)/g, 'nodeImport($1)')
      .replace(/\/\*\swebpackChunkName:.*\*\//g, '');
    return writeFile(filePath.replace('.client.js', '.node.js'), newContents);
  });
  return Promise.all(fileTransforms);
}

glob(path.join(__dirname, '..', 'lib', '**', '*.client.js'), buildNodeImports);
