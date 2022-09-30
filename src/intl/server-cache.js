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

import sizeOf from 'object-sizeof';
import { createHash } from 'node:crypto';

const cache = new Map();

const CLEANUP_INTERVAL = 10 * 60 * 1e3; // 10 minutes

const isDevelopment = process.env.NODE_ENV === 'development';

const generateHash = (a, b) => {
  const hash = createHash('sha256');
  hash.update(a === b || !b ? a : a + b);
  return hash.digest('hex');
};

// users are likely to make language changes in development, don't cache
const set = isDevelopment ? () => {} : (url, data, defaultUrl) => {
  cache.set(url, {
    data,
    lastAccess: Date.now(),
    hash: generateHash(url, defaultUrl),
    byoLangPack: defaultUrl && url !== defaultUrl,
  });
};

function get(url, defaultUrl) {
  if (!cache.has(url)) {
    return undefined;
  }
  const cached = cache.get(url);
  // Refetch on new module deployments when using BYO lang pack even if the URL has not changed
  if (cached.hash !== generateHash(url, defaultUrl)) return undefined;
  // Always refetch after 10min if using BYO lang pack
  if (!cached.byoLangPack) cached.lastAccess = Date.now();
  return cached.data;
}

const getEstimatedSize = () => sizeOf(Object.fromEntries(cache));

export {
  set,
  get,
  getEstimatedSize,
};

function cleanup() {
  const expiredThen = Date.now() - CLEANUP_INTERVAL;
  [...cache.entries()]
    .filter(([, { lastAccess }]) => lastAccess <= expiredThen)
    .forEach(([url]) => cache.delete(url));
}

// unref tells node not to wait for this interval to be cleared before exiting
// https://nodejs.org/api/timers.html#timers_timeout_unref
let intervalHandle = setInterval(cleanup, CLEANUP_INTERVAL);
// not all testing environments are setup to give us node-style timer handles
// ignoring coverage check as it evaluates to always be true in test cases
/* istanbul ignore next */
if (intervalHandle && intervalHandle.unref) intervalHandle.unref();
// release our reference for garbage collection
intervalHandle = null;
