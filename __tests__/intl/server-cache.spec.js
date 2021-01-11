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

import lolex from 'lolex';

describe('server-cache', () => {
  let set;
  let get;
  let getEstimatedSize;
  let clock;
  let intervalUnref;

  function setupCache(dontUseNodeTimers) {
    // lolex detects if it needs to provide the browser or node handle for timers
    // but jest, which uses browser handles, has already overwritten native timers
    // no, `jest.useRealTimers();` doesn't work, timers are still wrapped
    // overwrite setInterval to provide unref for server-cache
    const lolexSetInterval = global.setInterval;
    intervalUnref = jest.fn();
    global.setInterval = function (...args) {
      const id = lolexSetInterval.apply(this, args);
      if (dontUseNodeTimers) return id;
      return {
        id,
        unref: intervalUnref,
      };
    };

    jest.resetModules();
    // eslint-disable-next-line global-require
    const serverCache = require('../../src/intl/server-cache');
    set = serverCache.set;
    get = serverCache.get;
    getEstimatedSize = serverCache.getEstimatedSize;
  }

  beforeEach(() => {
    clock = lolex.install(0);
    jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    Date.now.mockRestore();
    clock.uninstall();
    set = undefined;
    get = undefined;
  });

  describe('set', () => {
    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('sets a value with a TTL', () => {
      delete process.env.NODE_ENV;
      setupCache();
      set('sets a value with a TTL', 'value');
      expect(Date.now).toHaveBeenCalledTimes(1);
    });

    it('skips during development', () => {
      process.env.NODE_ENV = 'development';
      setupCache();
      set('skips setting a value in development', 'value');
      expect(Date.now).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(() => setupCache());

    it('gets undefined if no value is stored', () => {
      expect(get('gets undefined if no value is stored')).toEqual(undefined);
    });

    it('gets the cached value and resets the TTL', () => {
      set('gets the cached value and resets the TTL', 'yay');
      clock.tick(1000);
      expect(Date.now).toHaveBeenCalledTimes(1);
      clock.tick(1000);
      expect(get('gets the cached value and resets the TTL')).toEqual('yay');
      expect(Date.now).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEstimatedSize', () => {
    it('returns memory allocation of cache', () => {
      delete process.env.NODE_ENV;
      setupCache();
      expect(getEstimatedSize()).toEqual(0);
      set('add entry to cache', 'entry');
      expect(getEstimatedSize()).toBe(82);
    });
  });

  describe('cleanup', () => {
    it('leaves non-expired values in cache', () => {
      setupCache();
      set('keep me', 'in the cache');
      clock.tick(7 * 60 * 1e3);
      expect(get('keep me')).toEqual('in the cache');
      clock.tick(7 * 60 * 1e3);
      expect(get('keep me')).toEqual('in the cache');
    });

    it('removes expired values', () => {
      setupCache();
      set('expire me', 'from the cache');
      clock.tick(10 * 60 * 1e3);
      expect(get('expire me')).toEqual(undefined);
    });

    it('does not prevent node from shutting down', () => {
      setupCache();
      // only once as each call can be expensive
      expect(intervalUnref).toHaveBeenCalledTimes(1);
    });

    it('does not prevent testing in jsdom environments', () => {
      setupCache(true);
    });
  });
});
