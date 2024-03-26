/**
 * @jest-environment node
 */

/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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
import { fromJS } from 'immutable';
import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';
import Intl from 'lean-intl';

// Module under test
import {
  updateLocale,
  loadedLocales,
} from '../../src/intl';

global.Intl = Intl;

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

describe('intl duck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.resetMocks();
  });

  describe('actions', () => {
    const middlewares = [thunk.withExtraArgument({ fetchClient: fetch })];
    const mockStore = (initialState) => configureStore(middlewares)(fromJS(initialState));

    it('should not call getLocalePack when process.env.ONE_CONFIG_USE_NATIVE_INTL env var is true, if window is undefined', async () => {
      process.env.ONE_CONFIG_USE_NATIVE_INTL = true;
      const store = mockStore({ config: fromJS({ enableAllIntlLocales: 'true' }) });
      await store.dispatch(updateLocale('en-GB'));
      expect(store.getActions()[0]).toMatchSnapshot();
      expect(loadedLocales.has('en-GB')).toEqual(false);
    });
  });
});
