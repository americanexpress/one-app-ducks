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

import { createStore } from 'redux';
import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';

import * as publicAPI from '../src';

jest.mock('../src/intl/localePacks.client', () => require('../lib/intl/localePacks.client'), { virtual: true });
jest.mock('../src/intl/localePacks.node', () => require('../lib/intl/localePacks.node'), { virtual: true });

describe('index', () => {
  it('should expose the publicAPI', () => {
    expect(Object.keys(publicAPI)).toMatchSnapshot();
  });
});

describe('immutable store test', () => {
  const { default: reducers } = publicAPI;

  function isImmutableDeep(state) {
    return fromJS(state).equals(state);
  }

  it('should initialize the state for all reducers with immutable data types', () => {
    expect.assertions(2);

    const store = createStore(combineReducers(reducers));
    const state = store.getState();

    expect(isImmutableDeep(state)).toBe(true);
    expect(state).toMatchSnapshot();
  });

  it('should merge initial immutable state with missing initial state', () => {
    expect.assertions(2);

    const store = createStore(combineReducers(reducers), fromJS({}));
    const state = store.getState();

    expect(isImmutableDeep(state)).toBe(true);
    expect(state).toMatchSnapshot();
  });

  it('should fail to initialize if provided non-immutable initial state', () => {
    expect.assertions(1);

    expect(() => {
      createStore(combineReducers(reducers), {});
    }).toThrowErrorMatchingSnapshot();
  });
});
