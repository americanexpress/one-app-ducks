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

import browser, { setOrigin, setUserAgent, getCookies } from './browser';
import error, { applicationError, clearError } from './error';
import errorReporting, { addErrorToReport, sendErrorReport } from './errorReporting';
import intlReducer, {
  getLocalePack,
  loadLanguagePack,
  queryLanguagePack,
  updateLocale,
} from './intl';
import redirection, { externalRedirect } from './redirection';
import rendering, {
  setDangerouslyDisableScripts,
  setDangerouslyDisableScriptsAndStyles,
  setRenderPartialOnly,
  setRenderTextOnly,
} from './rendering';

export default {
  browser,
  error,
  errorReporting,
  intl: intlReducer,
  redirection,
  rendering,
};

export {
  // browser
  setOrigin,
  setUserAgent,
  getCookies,

  // error
  applicationError,
  clearError,

  // errorReporting
  addErrorToReport,
  sendErrorReport,

  // intl
  getLocalePack,
  loadLanguagePack,
  queryLanguagePack,
  updateLocale,

  // redirection
  externalRedirect,

  // rendering
  setDangerouslyDisableScripts,
  setDangerouslyDisableScriptsAndStyles,
  setRenderPartialOnly,
  setRenderTextOnly,
};
