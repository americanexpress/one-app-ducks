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
import Cookies from 'js-cookie';
import typeScope from './utils/typeScope';

// constants
const SET_ORIGIN = `${typeScope}/browser/SET_ORIGIN`;
const SET_USER_AGENT = `${typeScope}/browser/SET_USER_AGENT`;

function buildInitialState({ req } = {}) {
  let cookies = null;
  let userAgent = null;
  let location = {
    origin: null,
    host: null,
    protocol: null,
  };

  if (global.BROWSER) {
    cookies = Cookies.get();
    userAgent = window.navigator.userAgent;
    location = {
      origin: window.location.origin
        || `${window.location.protocol}//${window.location.host}`,
      host: window.location.host,
      protocol: window.location.protocol,
    };
  } else if (req) {
    cookies = req.cookies;
    userAgent = req.headers['user-agent'];
    const host = req.forwarded && req.forwarded.host ? req.forwarded.host : req.headers.host;
    const protocol = req.forwarded && req.forwarded.proto ? req.forwarded.proto : req.protocol;
    location = {
      origin: `${protocol}://${host}`,
      host,
      protocol: `${protocol}:`,
    };
  }

  return fromJS({
    cookies,
    location,
    userAgent,
  });
}

// reducers
// eslint-disable-next-line default-param-last -- reducers have default params first
export default function browserReducer(state = buildInitialState(), action) {
  switch (action.type) {
    case SET_ORIGIN:
      return state.setIn(['location', 'origin'], action.origin);

    case SET_USER_AGENT:
      return state.set('userAgent', action.userAgent);

    default:
      return fromJS(state);
  }
}

browserReducer.buildInitialState = buildInitialState;

// actions
export function setOrigin(origin) {
  return {
    type: SET_ORIGIN,
    origin,
  };
}

export function setUserAgent(userAgent) {
  return {
    type: SET_USER_AGENT,
    userAgent,
  };
}

// selectors
const getCookieState = (state) => state.getIn(['browser', 'cookies']).toJS();

export const getCookies = (state) => (typeof window !== 'undefined' ? Cookies.get() : getCookieState(state));
