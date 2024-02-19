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

/* eslint no-unused-expressions:0, no-underscore-dangle:0 -- disable for test */
import { fromJS, Map as iMap } from 'immutable';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import Intl from 'lean-intl';
import holocron from 'holocron';
import serverLangPackCache from '../../src/intl/server-cache';

// Module under test
import reducer, {
  deferredForceLoad,
  loadLanguagePack,
  queryLanguagePack,
  updateLocale,
  getLocalePack,
  UPDATE_LOCALE,
  LANGUAGE_PACK_REQUEST,
  LANGUAGE_PACK_SUCCESS,
  LANGUAGE_PACK_FAILURE,
  LANGUAGE_PACK_DEFERRED_FORCE_LOAD,
  loadedLocales,
} from '../../src/intl';

jest.mock('holocron', () => ({
  getModuleMap: jest.fn(),
}));

global.Intl = Intl;

const { buildInitialState } = reducer;

jest.mock('../../src/intl/localePacks.client', () => require('../../lib/intl/localePacks.client'), { virtual: true });
jest.mock('../../src/intl/localePacks.node', () => {
  const realLocalePacks = require('../../lib/intl/localePacks.node');
  const mockLocalePacks = {
    xx: jest.fn(() => Promise.resolve('xx')),
    'yy-Yyyy': jest.fn(() => Promise.resolve('yy-Yyyy')),
    'zz-XA': jest.fn(() => Promise.resolve('zz-XA')),
  };

  return { ...realLocalePacks, ...mockLocalePacks };
}, { virtual: true });
jest.mock('../../src/intl/server-cache');
jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

Date.now = jest.fn(() => 1234);

function TimeoutError(...args) {
  const native = Error.apply(this, args);
  this.name = 'TimeoutError';
  this.message = native.message;
  this.stack = native.stack;
}

TimeoutError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: TimeoutError,
  },
});

describe('intl duck', () => {
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => 0);
  jest.spyOn(console, 'info').mockImplementation(() => 0);

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.resetMocks();
  });

  describe('reducer', () => {
    it('default action', () => {
      const state = fromJS({ data: 'data' });
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(state, action)).toBe(state);
    });

    it('should have an initial state', () => {
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(undefined, action)).toMatchSnapshot();
    });

    it('should get the active locale from the request\'s accepts languages', () => {
      const req = { cookies: {}, acceptsLanguages: () => ['de-AT'] };
      const state = buildInitialState({ req });
      expect(state.get('activeLocale')).toBe('de-AT');
    });

    it('should use the default locale when accepts languages cannot be satisfied', () => {
      const req = { cookies: {}, acceptsLanguages: () => undefined };
      const state = buildInitialState({ req });
      expect(state.get('activeLocale')).toBe('en-US');
    });

    it('should use the default locale when accepts languages is a wildcard', () => {
      const req = { cookies: {}, acceptsLanguages: () => ['*'] };
      const state = buildInitialState({ req });
      expect(state.get('activeLocale')).toBe('en-US');
    });

    it('should use the default locale when navigator.language is undefined', () => {
      const { navigator } = global;
      delete global.navigator;
      const state = buildInitialState();
      expect(state.get('activeLocale')).toBe('en-US');
      global.navigator = navigator;
    });

    it('update locale action', () => {
      const oldState = fromJS({ activeLocale: 'oldLocale' });
      const action = {
        type: UPDATE_LOCALE,
        locale: 'de-AT',
      };

      expect(reducer(oldState, action)).toMatchSnapshot();
    });

    it('language pack request action', () => {
      const oldState = fromJS({ activeLocale: 'locale' });
      const promise = Promise.resolve();
      const action = {
        type: LANGUAGE_PACK_REQUEST,
        locale: 'locale',
        componentKey: 'foo',
        promise,
      };
      const newState = {
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              isLoading: true,
              data: {},
              promise,
            },
          },
        },
      };
      expect(reducer(oldState, action).toJS()).toEqual(newState);
    });

    it('language pack request action on the client after loading on the server', () => {
      const oldState = fromJS({
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              _loadedOnServer: true,
            },
          },
        },
      });
      const action = {
        type: LANGUAGE_PACK_REQUEST,
        locale: 'locale',
        componentKey: 'foo',
        promise: Promise.resolve(),
      };
      const newState = {
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              _loadedOnServer: true,
            },
          },
        },
      };
      expect(reducer(oldState, action).toJS()).toEqual(newState);
    });

    it('language pack failure action on the client after loading on the server', () => {
      const fakeError = new Error('error');
      const oldState = fromJS({
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              _loadedOnServer: true,
            },
          },
        },
      });
      const action = {
        type: LANGUAGE_PACK_FAILURE,
        locale: 'locale',
        componentKey: 'foo',
        error: fakeError,
      };
      const newState = {
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              _loadedOnServer: true,
            },
          },
        },
      };
      expect(reducer(oldState, action).toJS()).toEqual(newState);
    });

    it('successful language request action on the server', () => {
      global.BROWSER = false;
      const oldState = fromJS({ activeLocale: 'locale' });
      const action = {
        type: LANGUAGE_PACK_SUCCESS,
        locale: 'locale',
        componentKey: 'foo',
        data: iMap({ data: 'data' }),
      };
      expect(reducer(oldState, action)).toMatchSnapshot();
    });

    it('successful language request action on the browser', () => {
      global.BROWSER = true;
      const oldState = fromJS({ activeLocale: 'locale' });
      const action = {
        type: LANGUAGE_PACK_SUCCESS,
        locale: 'locale',
        componentKey: 'foo',
        data: { data: 'data' },
      };
      expect(reducer(oldState, action)).toMatchSnapshot();
    });

    it('unsuccessful language request action', () => {
      const oldState = fromJS({
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              isLoading: true,
              data: {},
            },
          },
        },
      });
      const fakeError = new Error('error');
      const action = {
        type: LANGUAGE_PACK_FAILURE,
        locale: 'locale',
        componentKey: 'foo',
        error: fakeError,
      };
      const newState = {
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              error: fakeError,
              errorExpiration: 11234,
              isLoading: false,
              data: {},
            },
          },
        },
      };
      expect(reducer(oldState, action).toJS()).toEqual(newState);
    });

    it('should keep the loaded data on unsuccessful language request action after success on server', () => {
      global.BROWSER = false;
      let state = fromJS({ activeLocale: 'locale' });
      const successAction = {
        type: LANGUAGE_PACK_SUCCESS,
        locale: 'locale',
        componentKey: 'foo',
        data: { data: 'data' },
      };
      const failureAction = {
        type: LANGUAGE_PACK_FAILURE,
        locale: 'locale',
        componentKey: 'foo',
        error: new Error('error'),
      };
      state = reducer(state, successAction);
      global.BROWSER = true;
      expect(reducer(state, failureAction)).toMatchSnapshot();
    });

    it('should remove error & errorExpiration on successful language request', () => {
      const oldState = fromJS({
        activeLocale: 'locale',
        languagePacks: {
          locale: {
            foo: {
              isLoading: false,
              data: {},
              errorExpiration: 1223,
              error: { name: 'timeouterror' },
            },
          },
        },
      });
      const successAction = {
        type: LANGUAGE_PACK_SUCCESS,
        locale: 'locale',
        componentKey: 'foo',
        data: { data: 'data' },
      };
      expect(reducer(oldState, successAction)).toMatchSnapshot();
      const requestAction = {
        type: LANGUAGE_PACK_REQUEST,
        locale: 'locale',
        componentKey: 'foo',
        promise: Promise.resolve(),
      };
      expect(reducer(oldState, requestAction)).toMatchSnapshot();
    });

    describe('update locale with mock data', () => {
      it('should update the state with mocked data', () => {
        const oldState = fromJS({ activeLocale: 'oldLocale' });
        const action = {
          type: UPDATE_LOCALE,
          locale: 'en-NZ',
        };
        expect(reducer(oldState, action)).toMatchSnapshot();
      });
    });

    it('should add relevant meta when deferring a force load', () => {
      const state = fromJS({ activeLocale: 'en-US' });
      const action = deferredForceLoad('en-US', 'axp-module');
      expect(reducer(state, action)).toMatchSnapshot();
    });
  });

  describe('actions', () => {
    const middlewares = [thunk.withExtraArgument({ fetchClient: fetch })];
    const mockStore = (initialState) => configureStore(middlewares)(fromJS(initialState));

    // TODO: test error scenarios when we are no longer mocking fetch
    describe('loadLanguagePack', () => {
      const locale = 'en-US';
      const fallbackLocale = 'qya';
      const componentKey = 'foo-bar';

      const successfulRequestAction = {
        type: LANGUAGE_PACK_SUCCESS,
        componentKey,
        locale,
        // Object.assign with a `data` key specific to the spec
        lastFetched: 1234,
      };

      beforeEach(() => {
        global.BROWSER = true;
      });

      it('not loaded or loading', async () => {
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
          }),
          config: fromJS({}),
        });
        fetch.mockResponseOnce(JSON.stringify({ test: 'not loaded or loading' }));
        holocron.getModuleMap.mockImplementation(() => fromJS({
          modules: {
            'foo-bar': {
              baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
            },
          },
        }));

        await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions()[0].type).toBe(LANGUAGE_PACK_REQUEST);
        expect(store.getActions()[0].componentKey).toBe(componentKey);
        expect(store.getActions()[0].locale).toBe(locale);
        expect(store.getActions()[1]).toEqual({ data: fromJS({ test: 'not loaded or loading' }), ...successfulRequestAction });
      });

      it('loads', async () => {
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
          }),
          config: fromJS({}),
        });
        fetch.mockResponseOnce(JSON.stringify({
          data: 'bar',
        }));

        const resource = await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions().length).toBe(2);
        expect(resource).toEqual({ data: 'bar' });
      });

      it('is loaded', async () => {
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
            languagePacks: {
              'en-US': {
                [componentKey]: {
                  data: 'data',
                },
              },
            },
          }),
          holocron: fromJS({}),
        });

        const resource = await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions().length).toBe(0);
        expect(resource).toEqual(fromJS({ data: 'data' }));
      });

      it('is loaded on server', async () => {
        global.BROWSER = true;
        window.requestIdleCallback = jest.fn();
        let intl = fromJS({ activeLocale: locale });
        intl = intl.setIn(['languagePacks', 'en-US', componentKey], {
          data: 'data',
          _loadedOnServer: true,
        });
        const store = mockStore({
          intl,
          config: fromJS({}),
        });

        const resource = await store.dispatch(loadLanguagePack(componentKey));
        let actions = store.getActions();
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe(LANGUAGE_PACK_DEFERRED_FORCE_LOAD);
        expect(resource).toEqual({ data: 'data', _loadedOnServer: true });
        expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
        expect(window.requestIdleCallback.mock.calls).toMatchSnapshot();
        expect(setTimeout).not.toHaveBeenCalled();
        fetch.mockResponseOnce(JSON.stringify({
          data: 'data',
        }));
        await window.requestIdleCallback.mock.calls[0][0]();
        actions = store.getActions();
        expect(actions.length).toBe(3);
        expect(actions[1].type).toBe(LANGUAGE_PACK_REQUEST);
        expect(actions[2].type).toBe(LANGUAGE_PACK_SUCCESS);
      });

      it('is loaded on the server and is using a fallback locale', async () => {
        expect.assertions(6);
        global.BROWSER = true;
        window.requestIdleCallback = jest.fn();
        const activeLocale = 'zz-TP';
        let intl = fromJS({ activeLocale });
        intl = intl.setIn(['languagePacks', 'zz-TP', componentKey], {
          data: 'data',
          _loadedOnServer: true,
        });
        const store = mockStore({
          intl,
          config: fromJS({}),
        });

        fetch.mockResponses([
          [JSON.stringify({ data: 'fallback' })],
          [JSON.stringify({}), { status: 404, statusText: 'Not found' }],
        ]);

        const resource = await store.dispatch(loadLanguagePack(componentKey, { fallbackLocale: 'en-US' }));
        let actions = store.getActions();
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe(LANGUAGE_PACK_DEFERRED_FORCE_LOAD);
        expect(resource).toEqual({ data: 'data', _loadedOnServer: true });
        expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
        await window.requestIdleCallback.mock.calls[0][0]();
        actions = store.getActions();
        expect(actions.length).toBe(3);
        expect(actions[2].data).toEqual(iMap({ data: 'fallback' }));
      });

      it('is loaded on server and is requested on the server', async () => {
        global.BROWSER = false;
        window.requestIdleCallback = jest.fn();
        let intl = fromJS({ activeLocale: locale });
        intl = intl.setIn(['languagePacks', 'en-US', componentKey], {
          data: 'data',
          _loadedOnServer: true,
        });
        const store = mockStore({
          intl,
          config: fromJS({}),
        });

        await store.dispatch(loadLanguagePack(componentKey));
        const actions = store.getActions();
        expect(actions.length).toBe(0);
      });

      it('is loaded on server (no requestIdleCallback)', () => {
        global.BROWSER = true;
        window.requestIdleCallback = undefined;
        let intl = fromJS({ activeLocale: locale });
        intl = intl.setIn(['languagePacks', 'en-US', componentKey], {
          data: 'data',
          _loadedOnServer: true,
        });
        const store = mockStore({
          intl,
          holocron: fromJS({}),
        });

        return store.dispatch(loadLanguagePack(componentKey))
          .then((resource) => {
            const actions = store.getActions();
            expect(actions.length).toBe(1);
            expect(actions[0].type).toBe(LANGUAGE_PACK_DEFERRED_FORCE_LOAD);
            expect(resource).toEqual({ data: 'data', _loadedOnServer: true });
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(setTimeout.mock.calls).toMatchSnapshot();
          });
      });

      it('is loading', async () => {
        const store = mockStore({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                [componentKey]: {
                  isLoading: true,
                  promise: Promise.resolve({ data: 'data' }),
                },
              },
            },
          }),
          holocron: fromJS({}),
        });

        const resource = await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions().length).toBe(0);
        expect(resource).toEqual({ data: 'data' });
      });

      it('last fetch failed', async () => {
        fetch.mockResponseOnce(JSON.stringify({
          test: 'last fetch failed',
        }));
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
            languagePacks: {
              'en-US': {
                foo: {
                  error: new Error('fetch failed'),
                },
              },
            },
          }),
          config: fromJS({}),
        });

        await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions()[0].type).toBe(LANGUAGE_PACK_REQUEST);
        expect(store.getActions()[0].componentKey).toBe(componentKey);
        expect(store.getActions()[0].locale).toBe(locale);
        expect(store.getActions()[1]).toEqual({ data: iMap({ test: 'last fetch failed' }), ...successfulRequestAction });
      });

      it('should use a custom URL when provided', async () => {
        const url = `https://example.com/language/${componentKey}/${locale}`;
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
          }),
          config: fromJS({}),
        });
        fetch.mockResponseOnce(async (req) => {
          if (req.url === url) {
            return { body: JSON.stringify({ data: 'custom language' }) };
          }
          throw new Error(`Unexpected URL: ${req.url}`);
        });

        const resource = await store.dispatch(loadLanguagePack(componentKey, { url }));
        expect(store.getActions().length).toBe(2);
        expect(resource).toEqual({ data: 'custom language' });
      });

      it('should use the fallback custom URL when provided', async () => {
        const url = `https://example.com/language/${componentKey}/${locale}`;
        const fallbackUrl = `https://example.com/language/${componentKey}/${fallbackLocale}`;
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
          }),
          config: fromJS({}),
        });
        fetch.mockResponse(async (req) => {
          if (req.url === url) {
            return { body: '', status: 404, statusText: 'Not Found' };
          }
          if (req.url === fallbackUrl) {
            return { body: JSON.stringify({ data: 'fallback custom language' }) };
          }
          throw new Error(`Unexpected URL: ${req.url}`);
        });

        const resource = await store.dispatch(loadLanguagePack(componentKey, {
          url,
          fallbackLocale,
          fallbackUrl,
        }));
        expect(store.getActions().length).toBe(2);
        expect(resource).toEqual({ data: 'fallback custom language' });
      });

      it('should throw an error if there is a fallback URL and no fallback locale', async () => {
        expect.assertions(1);
        const url = `https://example.com/language/${componentKey}/${locale}`;
        const fallbackUrl = `https://example.com/language/${componentKey}/${fallbackLocale}`;
        const store = mockStore({
          intl: fromJS({
            activeLocale: locale,
          }),
          config: fromJS({}),
        });

        try {
          await store.dispatch(loadLanguagePack(componentKey, { url, fallbackUrl }));
        } catch (error) {
          // eslint-disable-next-line jest/no-conditional-expect -- test error
          expect(error).toEqual(new Error('Fallback locale is required when fallback URL is provided for language pack'));
        }
      });

      it('should handle no activeLocale', async () => {
        expect.assertions(1);
        const store = mockStore({
          intl: fromJS({}),
          holocron: fromJS({}),
        });
        try {
          await store.dispatch(loadLanguagePack('foo'));
        } catch (error) {
          // eslint-disable-next-line jest/no-conditional-expect -- test error
          expect(error).toEqual(new Error('Failed to load language pack. No locale was set or given'));
        }
      });

      it('should throw when there is a non-404 error response', async () => {
        expect.assertions(1);
        const activeLocale = 'bd-LC';
        const store = mockStore({
          intl: fromJS({
            activeLocale,
          }),
          config: fromJS({}),
        });
        holocron.getModuleMap.mockImplementation(() => fromJS({
          modules: {
            'foo-bar': {
              baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
            },
          },
        }));
        const langPackUrl = `https://example.com/cdn/foo-bar/1.0.0/${activeLocale.toLowerCase()}/${componentKey}.json`;

        fetch.mockResponseOnce(JSON.stringify({}), { url: langPackUrl, statusText: 'Internal Server Error', status: 500 });

        await expect(store.dispatch(loadLanguagePack(componentKey)))
          .rejects.toMatchSnapshot();
      });

      it('should throw when the error does not have a response', async () => {
        expect.assertions(1);
        const activeLocale = 'en-US';
        const store = mockStore({
          intl: fromJS({
            activeLocale,
          }),
          config: fromJS({}),
        });

        fetch.mockResponseOnce(() => Promise.reject(new Error('This error has no response')));

        await expect(store.dispatch(loadLanguagePack(componentKey)))
          .rejects.toMatchSnapshot();
      });

      it('should retry for the fallback locale if requested language pack is not found', async () => {
        expect.assertions(3);
        const activeLocale = 'zz-TP';
        const store = mockStore({
          intl: fromJS({
            activeLocale,
          }),
          config: fromJS({}),
        });

        holocron.getModuleMap.mockImplementation(() => fromJS({
          modules: {
            'foo-bar': {
              baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
            },
          },
        }));

        const langPackUrl = `https://example.com/cdn/foo-bar/1.0.0/${activeLocale.toLowerCase()}/${componentKey}.json`;

        fetch.mockResponseOnce(JSON.stringify({}), { url: langPackUrl, statusText: 'Not Found', status: 404 });

        fetch.mockResponseOnce(JSON.stringify({ data: 'fallback' }));

        const resource = await store.dispatch(loadLanguagePack(componentKey, { fallbackLocale: 'en-US' }));
        expect(store.getActions().length).toBe(2);
        expect(consoleWarnSpy.mock.calls[0][0]).toBe('Missing zz-TP language pack for foo-bar, falling back to en-US.');
        expect(resource).toEqual({ data: 'fallback' });
      });

      it('should not retry if no fallback locale is given', async () => {
        expect.assertions(3);
        const activeLocale = 'zz-TP';
        const store = mockStore({
          intl: fromJS({
            activeLocale,
          }),
          config: fromJS({}),
        });

        holocron.getModuleMap.mockImplementation(() => fromJS({
          modules: {
            'foo-bar': {
              baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
            },
          },
        }));

        const langPackUrl = `https://example.com/cdn/foo-bar/1.0.0/${activeLocale.toLowerCase()}/${componentKey}.json`;

        fetch.mockResponseOnce(JSON.stringify({}), { url: langPackUrl, statusText: 'Not Found', status: 404 });

        const resource = await store.dispatch(loadLanguagePack(componentKey));
        expect(store.getActions().length).toBe(2);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(resource).toEqual({});
      });

      describe('server-side caching', () => {
        beforeEach(() => {
          global.BROWSER = false;
          serverLangPackCache.mock.reset();
        });

        it('caches good responses and uses the cache', async () => {
          expect.assertions(6);
          const store = mockStore({
            intl: fromJS({
              activeLocale: locale,
            }),
            config: fromJS({}),
          });

          holocron.getModuleMap.mockImplementation(() => fromJS({
            modules: {
              'foo-bar': {
                baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
              },
            },
          }));
          const staticLocale = `https://example.com/cdn/foo-bar/1.0.0/${locale.toLowerCase()}/${componentKey}.json`;
          fetch.mockResponseOnce(JSON.stringify({ test: 'caches good responses and uses the cache' }));

          const resource = await store.dispatch(loadLanguagePack(componentKey));
          expect(resource).toEqual({ test: 'caches good responses and uses the cache' });
          expect(fetch).toHaveBeenCalledTimes(1);
          expect(console.info).toHaveBeenCalledWith(`setting serverLangPackCache: url ${staticLocale}, data`, { test: 'caches good responses and uses the cache' });

          const cachedResource = await store.dispatch(loadLanguagePack(componentKey));
          expect(cachedResource).toEqual({ test: 'caches good responses and uses the cache' });
          expect(fetch).toHaveBeenCalledTimes(1);
          expect(console.info).toHaveBeenCalledWith(`using serverLangPackCache for ${staticLocale}`);
        });

        it('does not cache bad responses', async () => {
          const store = mockStore({
            intl: fromJS({
              activeLocale: locale,
            }),
            config: fromJS({}),
          });
          holocron.getModuleMap.mockImplementation(() => fromJS({
            modules: {
              'foo-bar': {
                baseUrl: 'https://example.com/cdn/foo-bar/1.0.0',
              },
            },
          }));
          const staticLocale = `https://example.com/cdn/foo-bar/1.0.0/${locale.toLowerCase()}/${componentKey}.json`;

          fetch.mockResponseOnce(JSON.stringify({}), { url: staticLocale, statusText: 'Not Found', status: 404 });
          fetch.mockResponseOnce(JSON.stringify({ test: 'does not cache bad responses' }));

          expect.assertions(6);

          const resource = await store.dispatch(loadLanguagePack(componentKey));
          expect(resource).toEqual({});
          expect(fetch).toHaveBeenCalledTimes(1);
          expect(console.info).not.toHaveBeenCalled();

          const cachedResource = await store.dispatch(loadLanguagePack(componentKey));
          expect(cachedResource).toEqual({ test: 'does not cache bad responses' });
          expect(fetch).toHaveBeenCalledTimes(2);
          expect(console.info).toHaveBeenCalledWith(`setting serverLangPackCache: url ${staticLocale}, data`, { test: 'does not cache bad responses' });
        });
      });
    });

    describe('queryLanguagePack', () => {
      it('should return a "complete" response if the language pack is already loaded', () => {
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { data: { some: 'language' }, isLoading: false },
              },
            },
          }),
        });
        fetch.mockResponseOnce(JSON.stringify({ some: 'language' }));
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(response.data).toEqual({ some: 'language' });
        expect(response.status).toBe('complete');
        expect(dispatch).toHaveBeenCalled();
      });

      it('should return a "complete" response with an error if the language pack failed to load', async () => {
        const error = new Error('failed to load');
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { error, isLoading: false, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(response.data).toEqual({});
        expect(response.status).toBe('complete');
        expect(response.error.message).toBe('failed to load');
        expect(dispatch).not.toHaveBeenCalled();
        await expect(response.promise).rejects.toEqual(error);
      });

      it('sets error when instanceof Error', async () => {
        const timeoutError = new TimeoutError('timedout');
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { error: timeoutError, isLoading: false, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(response.status).toBe('complete');
        expect(response.error.message).toBe('timedout');
        expect(dispatch).not.toHaveBeenCalled();
        await expect(response.promise).rejects.toEqual(timeoutError);
      });

      it('should not dispatch loadLanguagePack if loadLangaugePack failed to Load in the last 10 seconds', async () => {
        const error = new Error('failed to load');
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { error, errorExpiration: 11234, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(dispatch).not.toHaveBeenCalled();
        await expect(response.promise).rejects.toEqual(error);
      });

      it('should not dispatch loadLanguagePack if loadLangaugePack last failed with a client error', async () => {
        const error = new Error('Client error');
        error.response = { status: 404 };
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { error, isLoading: false, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(dispatch).not.toHaveBeenCalled();
        await expect(response.promise).rejects.toEqual(error);
      });

      it('should retry loadLanguagePack if it failed more than 10 seconds ago', async () => {
        const error = new Error('test error');
        error.response = { status: 503 };
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { error, errorExpiration: 1233, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        queryThunk(dispatch, getState);
        expect(dispatch).toHaveBeenCalled();
      });

      it('should return a loading iguazu response if the language pack is already loading', () => {
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {
              'en-US': {
                'my-module': { isLoading: true, data: {} },
              },
            },
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(response.data).toEqual({});
        expect(response.status).toBe('loading');
        expect(dispatch).toHaveBeenCalled();
      });

      it('should return a loading iguazu response if the language pack needs to be loaded', () => {
        const getState = () => fromJS({
          intl: fromJS({
            activeLocale: 'en-US',
            languagePacks: {},
          }),
        });
        const dispatch = jest.fn();
        const queryThunk = queryLanguagePack('my-module');
        const response = queryThunk(dispatch, getState);
        expect(response.status).toBe('loading');
        expect(dispatch).toHaveBeenCalled();
      });

      it('should pass along the fallback locale', async () => {
        expect.assertions(1);
        const componentKey = 'frank';
        const activeLocale = 'en-US';
        const fallbackLocale = 'ab-CD';
        const store = mockStore({
          intl: fromJS({
            activeLocale,
          }),
          config: fromJS({}),
        });

        holocron.getModuleMap.mockImplementation(() => fromJS({
          modules: {
            frank: {
              baseUrl: 'https://example.com/cdn/frank/1.0.0',
            },
          },
        }));
        const langPackUrl = `https://example.com/cdn/frank/1.0.0/${activeLocale.toLowerCase()}/${componentKey}.json`;

        fetch.mockResponseOnce(JSON.stringify({}), { url: langPackUrl, statusText: 'Not Found', status: 404 });

        const fallbackLangPackUrl = `https://example.com/cdn/frank/1.0.0/${fallbackLocale.toLowerCase()}/${componentKey}.json`;

        fetch.mockResponseOnce(JSON.stringify({ data: 'fallback language data' }));

        const queryThunk = queryLanguagePack(componentKey, { fallbackLocale });
        const response = store.dispatch(queryThunk);
        await response.promise;
        expect(fetch.mock.calls[1][0]).toBe(fallbackLangPackUrl);
      });
    });

    it('updateLocale', async () => {
      const locale = 'en-NZ';
      const store = mockStore({
        intl: fromJS({}),
        config: fromJS({}),
      });

      const updateLocaleAction = {
        type: UPDATE_LOCALE,
        locale,
      };

      await store.dispatch(updateLocale(locale));
      expect(store.getActions()[0]).toEqual(updateLocaleAction);
    });

    describe('updateLocale actions test', () => {
      it('should reject if an unsupported locale is given', () => {
        const store = mockStore({ config: fromJS({}) });
        return store.dispatch(updateLocale('be-BY'))
          .catch((message) => {
            // eslint-disable-next-line jest/no-conditional-expect -- test error
            expect(message).toMatchSnapshot();
          });
      });

      it('should allow any valid BCP 47 locale if enableAllIntlLocales is true', () => {
        const store = mockStore({ config: fromJS({ enableAllIntlLocales: 'true' }) });
        return store.dispatch(updateLocale('be-BY'))
          .then(() => {
            expect(store.getActions()[0]).toMatchSnapshot();
          });
      });

      it('should reject a valid BCP 47 locale if enableAllIntlLocales is true and Intl.js does not have a bundle for it', () => {
        const store = mockStore({ config: fromJS({ enableAllIntlLocales: 'true' }) });
        return store.dispatch(updateLocale('tlh'))
          .catch((err) => {
            // eslint-disable-next-line jest/no-conditional-expect -- test error
            expect(err).toMatchSnapshot();
          });
      });

      it('should reject if no locale is given', () => {
        const store = mockStore({ config: fromJS({}) });
        return store.dispatch(updateLocale())
          .catch((error) => {
            // eslint-disable-next-line jest/no-conditional-expect -- test error
            expect(error.message).toMatchSnapshot();
          });
      });
    });

    it('should not call getLocalePack when useNativeIntl env var is true', async () => {
      window.useNativeIntl = true;
      const store = mockStore({ config: fromJS({ enableAllIntlLocales: 'true' }) });
      await store.dispatch(updateLocale('en-GB'));
      expect(store.getActions()[0]).toMatchSnapshot();
      expect(loadedLocales.has('en-GB')).toEqual(false);
    });
  });

  describe('getLocalePack', () => {
    it('should get the best available locale pack', async () => {
      expect.assertions(4);

      await expect(getLocalePack('zz-XA')).resolves.toBe('zz-XA');
      await expect(getLocalePack('xx-XX')).resolves.toBe('xx');
      await expect(getLocalePack('xx-Xxxx-XX')).resolves.toBe('xx');
      await expect(getLocalePack('yy-Yyyy-YY')).resolves.toBe('yy-Yyyy');
    });
    it('should only load each langpack once', async () => {
      loadedLocales.clear();
      getLocalePack('zz-XA');
      getLocalePack('xx-XX');
      getLocalePack('xx-Xxxx-XX');
      getLocalePack('yy-Yyyy-YY');
      // call the same locale to verify its not added twice
      getLocalePack('yy-Yyyy-YY');
      expect(loadedLocales.size).toBe(4);
    });
  });
});
