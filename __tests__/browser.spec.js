/**
 * @jest-environment node
 */

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

import { fromJS } from 'immutable';

// module under test
import reducer, {
  setOrigin,
  setUserAgent,
  getCookies,
} from '../src/browser';

describe('browser duck', () => {
  describe('initial state', () => {
    it('correctly populates default values when no request is present', () => {
      const res = reducer.buildInitialState().toJS();
      expect(res.cookies).toEqual(null);
      expect(res.location.origin).toEqual(null);
      expect(res.userAgent).toEqual(null);
    });

    it('correctly uses request to populate initial state when req.forwarded exists', () => {
      const testData = {
        req: {
          cookies: {
            testKey: 'testValue',
          },
          forwarded: {
            host: 'forwardedtestorigin.test',
            proto: 'http',
          },
          headers: {
            'user-agent': 'test data',
            host: 'testorigin.test',
          },
          protocol: 'https',
        },
      };
      const res = reducer.buildInitialState(testData).toJS();
      expect(res.cookies).toEqual(testData.req.cookies);
      expect(res.location.origin).toBe('http://forwardedtestorigin.test');
      expect(res.location.protocol).toBe('http:');
      expect(res.location.host).toBe('forwardedtestorigin.test');
      expect(res.userAgent).toBe(testData.req.headers['user-agent']);
    });

    it('correctly uses request to populate initial state when req.forwarded does not exist', () => {
      const testData = {
        req: {
          cookies: {
            testKey: 'testValue',
          },
          headers: {
            'user-agent': 'test data',
            host: 'testorigin.test',
          },
          protocol: 'https',
        },
      };
      const res = reducer.buildInitialState(testData).toJS();
      expect(res.cookies).toEqual(testData.req.cookies);
      expect(res.location.origin).toBe('https://testorigin.test');
      expect(res.location.protocol).toBe('https:');
      expect(res.location.host).toBe('testorigin.test');
      expect(res.userAgent).toBe(testData.req.headers['user-agent']);
    });

    it('correctly uses window to populate initial state', () => {
      global.BROWSER = true;
      const document = { cookie: 'windowTestKey=windowTestValue' };
      const userAgent = 'Test User Agent';
      const origin = 'https://testorigin.test';
      const protocol = 'https:';
      const host = 'testorigin.test';
      global.document = document;
      global.window = {
        navigator: { userAgent },
        document,
        location: {
          origin,
          protocol,
          host,
        },
      };
      const res = reducer.buildInitialState().toJS();
      expect(res.cookies).toEqual({ windowTestKey: 'windowTestValue' });
      expect(res.location.origin).toBe(origin);
      expect(res.location.protocol).toBe(protocol);
      expect(res.location.host).toBe(host);
      expect(res.userAgent).toBe(userAgent);
    });

    it('composes an origin in the browser if it is not available', () => {
      global.BROWSER = true;
      const document = { cookie: 'windowTestKey=windowTestValue' };
      const userAgent = 'Test User Agent';
      const protocol = 'https:';
      const host = 'testorigin.test';
      global.document = document;
      global.window = {
        navigator: { userAgent },
        document,
        location: {
          protocol,
          host,
        },
      };
      const res = reducer.buildInitialState().toJS();
      expect(res.location.origin).toBe('https://testorigin.test');
    });
  });

  describe('reducer', () => {
    it('gives an initial state if none is provided', () => {
      global.BROWSER = true;
      const document = { cookie: 'windowTestKey=windowTestValue' };
      const userAgent = 'Test User Agent';
      const protocol = 'https:';
      const host = 'testorigin.test';
      global.document = document;
      global.window = {
        navigator: { userAgent },
        document,
        location: {
          protocol,
          host,
        },
      };
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(undefined, action)).toEqual(reducer.buildInitialState());
    });

    it('default action', () => {
      const state = fromJS({ data: 'data' });
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(state, action).toJS()).toEqual(state.toJS());
    });
  });

  describe('actions', () => {
    it('should set the origin', () => {
      const origin = 'https://example.tld';
      const action = setOrigin(origin);
      const prevState = fromJS({ location: { origin: null } });
      const expectedNextState = prevState.setIn(['location', 'origin'], origin);
      const actualNextState = reducer(prevState, action);
      expect(actualNextState.toJS()).toEqual(expectedNextState.toJS());
    });

    it('should set the user-agent', () => {
      const userAgent = 'Test User Agent';
      const action = setUserAgent(userAgent);
      const prevState = fromJS({ userAgent: null });
      const expectedNextState = prevState.set('userAgent', userAgent);
      const actualNextState = reducer(prevState, action);
      expect(actualNextState.toJS()).toEqual(expectedNextState.toJS());
    });
  });

  describe('selectors', () => {
    it('getCookies retrieves cookie from store when in node', () => {
      delete global.BROWSER;
      global.window = undefined;
      const testData = {
        req: {
          cookies: {
            nodeTestKey: 'nodeTestVal',
          },
          headers: { 'user-agent': 'test data' },
          Referer: 'Referer data',
        },
      };
      const state = fromJS({
        browser: reducer.buildInitialState(testData),
      });
      const res = getCookies(state);
      expect(res).toEqual({ nodeTestKey: 'nodeTestVal' });
    });

    it('getCookies retrieves cookie from document when in client', () => {
      const document = { cookie: 'windowTestKey=windowTestValue' };
      global.window = { document };
      global.document = document;
      const testData = {
        req: {
          cookies: {},
          headers: { 'user-agent': 'test data' },
          Referer: 'Referer data',
        },
      };
      const state = {
        browser: reducer.buildInitialState(testData),
      };
      const res = getCookies(state);
      expect(res).toEqual({ windowTestKey: 'windowTestValue' });
    });
  });
});
