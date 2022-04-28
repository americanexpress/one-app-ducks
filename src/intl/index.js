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

import { fromJS, Map as iMap } from 'immutable';

import typeScope from '../utils/typeScope';
import { getModuleBaseUrl } from '../utils/modules';

export const defaultLocale = 'en-US';

/* istanbul ignore next */
// This import will resolve in the build output
// eslint-disable-next-line import/no-unresolved
const localePacks = global.BROWSER ? require('./localePacks.client') : require('./localePacks.node');

export const UPDATE_LOCALE = `${typeScope}/intl/UPDATE_LOCALE`;
export const LANGUAGE_PACK_REQUEST = `${typeScope}/intl/LANGUAGE_PACK_REQUEST`;
export const LANGUAGE_PACK_SUCCESS = `${typeScope}/intl/LANGUAGE_PACK_SUCCESS`;
export const LANGUAGE_PACK_FAILURE = `${typeScope}/intl/LANGUAGE_PACK_FAILURE`;
export const LANGUAGE_PACK_DEFERRED_FORCE_LOAD = `${typeScope}/intl/LANGUAGE_PACK_DEFERRED_FORCE_LOAD`;

function buildInitialState({ req } = {}) {
  let activeLocale = null;

  if (!req) {
    const { navigator } = global;
    activeLocale = (navigator && navigator.language) || defaultLocale;
  } else {
    const acceptsLanguages = req.acceptsLanguages();
    activeLocale = acceptsLanguages && acceptsLanguages[0];
    if (!activeLocale || activeLocale === '*') {
      activeLocale = defaultLocale;
    }
  }

  return fromJS({
    activeLocale,
  });
}

export default function reducer(state = buildInitialState(), action) {
  switch (action.type) {
    case UPDATE_LOCALE: {
      return state.set('activeLocale', action.locale);
    }

    case LANGUAGE_PACK_REQUEST: {
      const { locale, componentKey } = action;
      const langPackState = state.getIn(['languagePacks', locale, componentKey], iMap());
      return langPackState.get('_loadedOnServer')
        ? state
        : state.updateIn(['languagePacks', locale, componentKey], iMap(), (nextState) => nextState.withMutations((map) => map
          .set('data', map.get('data', iMap()))
          .set('isLoading', true)
          .delete('error')
          .delete('errorExpiration')
        ));
    }

    case LANGUAGE_PACK_SUCCESS: {
      const { locale, componentKey, data } = action;
      return state.updateIn(['languagePacks', locale, componentKey], iMap(), (nextState) => nextState.withMutations((map) => map
        .set('data', iMap(data))
        .set('isLoading', false)
        .set('_loadedOnServer', !global.BROWSER)
        .delete('error')
        .delete('errorExpiration')
      ));
    }

    case LANGUAGE_PACK_FAILURE: {
      const { locale, componentKey, error } = action;
      // eslint-disable-next-line no-underscore-dangle
      if (state.getIn(['languagePacks', locale, componentKey, '_loadedOnServer'])) {
        return state;
      }
      return state.updateIn(['languagePacks', locale, componentKey], iMap(), (nextState) => nextState.withMutations((map) => map
        .set('data', map.get('data', iMap()))
        .set('isLoading', false)
        .set('errorExpiration', Date.now() + 10e3)
        .set('error', error)));
    }

    case LANGUAGE_PACK_DEFERRED_FORCE_LOAD: {
      const { locale, componentKey } = action;
      return state.setIn(['languagePacks', locale, componentKey, '_pendingDeferredForceLoad'], true);
    }

    default:
      return state;
  }
}

reducer.buildInitialState = buildInitialState;

// when running on the server, store previous requests for a language pack
// reduces network errors causing a needless 500 and removes the I/O time
/* istanbul ignore next */
const serverLangPackCache = global.BROWSER ? null : require('./server-cache');

export function deferredForceLoad(locale, componentKey) {
  return {
    type: LANGUAGE_PACK_DEFERRED_FORCE_LOAD,
    locale,
    componentKey,
  };
}

const isLoaded = ({ getState, locale, componentKey }) => {
  const state = getState();
  return state.getIn(['intl', 'languagePacks', locale, componentKey])
    && !state.getIn(['intl', 'languagePacks', locale, componentKey, 'isLoading'])
    && !state.getIn(['intl', 'languagePacks', locale, componentKey, 'error']);
};

const getLoadingPromise = ({ getState, locale, componentKey }) => {
  const state = getState();
  return state.getIn(['intl', 'languagePacks', locale, componentKey, 'isLoading']);
};

const langPackToIguazu = ({ getState, componentKey }) => {
  const state = getState();
  const locale = state.getIn(['intl', 'activeLocale']);
  const langPackState = state.getIn(['intl', 'languagePacks', locale, componentKey], iMap({
    data: iMap(),
  }));
  return {
    locale,
    status: langPackState.get('isLoading', true) ? 'loading' : 'complete',
    data: langPackState.get('data').toJS(),
    error: langPackState.get('error'),
    errorExpiration: langPackState.get('errorExpiration'),
  };
};

const getUrl = ({ getState, langPackLocale, componentKey }) => {
  const state = getState();
  const moduleBaseUrl = getModuleBaseUrl(componentKey);
  const localeFilename = state.getIn(['config', 'localeFilename']);

  return `${[
    moduleBaseUrl,
    langPackLocale.toLowerCase(),
    localeFilename || componentKey,
  ].join('/')}.json`;
};

const fetchLanguagePack = ({
  dispatch,
  getState,
  url,
  locale,
  fallbackLocale,
  componentKey,
  fetchClient,
  retry = false,
}) => {
  if (!global.BROWSER) {
    const cached = serverLangPackCache.get(url);
    if (cached) {
      // eslint-disable-next-line no-console
      console.info(`using serverLangPackCache for ${url}`);
      return Promise.resolve(cached);
    }
  }

  return fetchClient(url)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject(response);
    })
    .then((data) => {
      if (!global.BROWSER) {
        // eslint-disable-next-line no-console
        console.info(`setting serverLangPackCache: url ${url}, data`, data);
        serverLangPackCache.set(url, data);
      }
      return data;
    })
    .catch((errorOrResponse) => {
      if (errorOrResponse instanceof Error) {
        return Promise.reject(errorOrResponse);
      }

      const { status, statusText, url: responseUrl } = errorOrResponse;

      if (status === 404 && fallbackLocale && locale !== fallbackLocale && !retry) {
        console.warn(`Missing ${locale} language pack for ${componentKey}, falling back to ${fallbackLocale}.`);
        return fetchLanguagePack({
          getState,
          dispatch,
          url: getUrl({
            getState,
            langPackLocale: fallbackLocale,
            componentKey,
          }),
          locale: fallbackLocale,
          fetchClient,
          componentKey,
          retry,
        });
      }

      if (status === 404) return Promise.resolve({});

      const error = new Error(`${statusText} (${responseUrl})`);
      error.response = errorOrResponse;

      return Promise.reject(error);
    });
};

function deferredForcedLoadLanguagePack({
  dispatch,
  locale,
  fallbackLocale,
  componentKey,
  loadLanguagePackAction,
}) {
  if (!global.BROWSER) return;

  dispatch(deferredForceLoad(locale, componentKey));

  const callback = () => dispatch(loadLanguagePackAction(componentKey, {
    locale,
    force: true,
    fallbackLocale,
  }));

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 10e6);
  }
}

const getResourceFromState = ({
  dispatch,
  getState,
  locale,
  fallbackLocale,
  componentKey,
  loadLanguagePackAction,
}) => {
  const state = getState();
  const langPack = state.getIn(['intl', 'languagePacks', locale, componentKey]);
  // eslint-disable-next-line no-underscore-dangle
  if (langPack && langPack._loadedOnServer && !langPack._pendingDeferredForceLoad) {
    // Make a request on the client once idle even though the language
    // pack was loaded on the server, so that it can be cached by the
    // service worker for offline browsing.
    deferredForcedLoadLanguagePack({
      dispatch,
      locale,
      fallbackLocale,
      componentKey,
      loadLanguagePackAction,
    });
  }
  return langPack;
};

export function loadLanguagePack(
  componentKey,
  {
    locale: givenLocale,
    force = false,
    fallbackLocale,
  } = {}
) {
  return (dispatch, getState, { fetchClient }) => {
    const intlState = getState().get('intl');
    const locale = givenLocale
      || intlState.get('nextLocale')
      || intlState.get('activeLocale');
    if (!locale) {
      return Promise.reject(new Error('Failed to load language pack. No locale was set or given'));
    }

    const existingPromise = getLoadingPromise({ getState, locale, componentKey });

    if (existingPromise && !force) {
      return existingPromise;
    }


    if (isLoaded({ getState, locale, componentKey }) && !force) {
      return Promise.resolve(getResourceFromState({
        dispatch,
        getState,
        locale,
        fallbackLocale,
        componentKey,
        loadLanguagePackAction: loadLanguagePack,
      }));
    }
    const promise = fetchLanguagePack({
      getState,
      dispatch,
      url: getUrl({
        getState,
        langPackLocale: locale,
        componentKey,
      }),
      locale,
      fallbackLocale,
      fetchClient,
      componentKey,
    });

    // Dispatch request
    dispatch({
      type: LANGUAGE_PACK_REQUEST,
      componentKey,
      locale,
    });

    // Handle Success or Failure Dispatch as Side Effect
    promise
      .then((data) => dispatch({
        type: LANGUAGE_PACK_SUCCESS,
        lastFetched: Date.now(),
        componentKey,
        locale,
        data: fromJS(data),
      }))
      .catch((error) => dispatch({
        type: LANGUAGE_PACK_FAILURE,
        error,
        componentKey,
        locale,
      }));
    // Return original promise to have custom handling possible
    return promise;
  };
}

export function queryLanguagePack(componentKey, { fallbackLocale } = {}) {
  return (dispatch, getState) => {
    const iguazuState = langPackToIguazu({ getState, componentKey });
    if (iguazuState.error) {
      const isExpired = Date.now() > iguazuState.errorExpiration;
      if (!isExpired) {
        return {
          ...iguazuState,
          promise: Promise.reject(iguazuState.error),
        };
      }
    }
    const promise = dispatch(loadLanguagePack(componentKey, {
      locale: iguazuState.locale,
      fallbackLocale,
    }));
    return {
      ...langPackToIguazu({ getState, componentKey }),
      promise,
    };
  };
}

export function getLocalePack(locale) {
  const localeArray = locale.split('-');
  let localePack;

  while (localeArray.length && !localePack) {
    localePack = localePacks[localeArray.join('-')];
    localeArray.pop();
  }

  if (localePack) {
    return localePack();
  }

  return Promise.reject(new Error(`No locale bundle available for ${locale}`));
}

export function updateLocale(locale) {
  return (dispatch) => {
    if (!locale) {
      return Promise.reject(new Error('No locale was given'));
    }

    // supporting files for locale dependent libraries
    return getLocalePack(locale)
      .then(() => {
        dispatch({
          type: UPDATE_LOCALE,
          locale,
        });
      });
  };
}
