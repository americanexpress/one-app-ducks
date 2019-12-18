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

const cache = new Map();

const CLEANUP_INTERVAL = 10 * 60 * 1e3; // intended to be 10 minutes

const isDevelopment = process.env.NODE_ENV === 'development';

// users are likely to make language changes in development, don't cache
const set = isDevelopment ? () => {} : (url, data) => {
  cache.set(url, {
    data,
    lastAccess: Date.now(),
  });
};

function get(url) {
  if (!cache.has(url)) {
    return undefined;
  }
  const cached = cache.get(url);
  cached.lastAccess = Date.now();
  return cached.data;
}

export {
  set,
  get,
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
