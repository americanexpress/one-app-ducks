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
import typeScope from './utils/typeScope';

export const SERVER_SIDE_REDIRECT = `${typeScope}/redirection/SERVER_SIDE_REDIRECT`;
export const CLIENT_SIDE_REDIRECT = `${typeScope}/redirection/CLIENT_SIDE_REDIRECT`;
export const NOOP = `${typeScope}/redirection/NOOP`;

export const initialState = fromJS({
  destination: null,
  redirectionInFlight: false,
});

export default function redirectionReducer(state = initialState, action) {
  switch (action.type) {
    case SERVER_SIDE_REDIRECT:
      return state.get('destination')
        ? state
        : state.set('destination', action.destination);
    case CLIENT_SIDE_REDIRECT:
      return state.set('redirectionInFlight', true);
    default:
      return state;
  }
}

export function externalRedirect(destination) {
  if (typeof destination !== 'string') {
    return { type: NOOP };
  }

  if (global.BROWSER) {
    window.location.assign(destination);
    return {
      type: CLIENT_SIDE_REDIRECT,
    };
  }

  return {
    type: SERVER_SIDE_REDIRECT,
    destination,
  };
}
