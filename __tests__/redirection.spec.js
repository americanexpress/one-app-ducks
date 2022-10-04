/**
 * @jest-environment jsdom
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

import reducer, {
  SERVER_SIDE_REDIRECT,
  CLIENT_SIDE_REDIRECT,
  initialState,
  externalRedirect,
} from '../src/redirection';

describe('redirection', () => {
  const destination = 'http://americanexpress.io/';
  const assignSpy = jest.fn();
  Object.defineProperty(window, 'location', {
    value: {
      assign: assignSpy,
    },
  });

  beforeEach(() => jest.clearAllMocks());

  describe('reducer', () => {
    it('should ignore unrecognized actions', () => {
      const state = reducer(undefined, { type: 'UNRECOGNIZED_ACTION' });
      expect(state.equals(initialState)).toBe(true);
    });

    it('should set the destination for a server-side redirect', () => {
      const state = reducer(undefined, { type: SERVER_SIDE_REDIRECT, destination });
      expect(state.get('destination')).toBe(destination);
    });

    it('should not update the destination if it has already been set', () => {
      const state = reducer(
        initialState.set('destination', destination),
        {
          type: SERVER_SIDE_REDIRECT,
          destination: 'https://developer.americanexpress.com',
        }
      );
      expect(state.get('destination')).toBe(destination);
    });

    it('should not set destination for a client-side redirect', () => {
      const state = reducer(undefined, { type: CLIENT_SIDE_REDIRECT, destination });
      expect(state.get('destination')).toBe(null);
    });

    it('should set redirectionInFlight for a client-side redirect', () => {
      const state = reducer(undefined, { type: CLIENT_SIDE_REDIRECT, redirectionInFlight: true });
      expect(state.get('redirectionInFlight')).toBe(true);
    });
  });

  describe('externalRedirect', () => {
    it('should perform a client-side redirect on the browser', () => {
      global.BROWSER = true;
      const result = externalRedirect(destination);
      expect(assignSpy).toHaveBeenCalledWith(destination);
      expect(result).toMatchSnapshot();
    });

    it('should dispatch a SERVER_SIDE_REDIRECT on the server', () => {
      global.BROWSER = false;
      const result = externalRedirect(destination);
      expect(assignSpy).not.toHaveBeenCalled();
      expect(result).toMatchSnapshot();
    });

    it('should dispatch NOOP if destination is not a string', () => {
      const result = externalRedirect(true);
      expect(result).toMatchSnapshot();
    });
  });
});
