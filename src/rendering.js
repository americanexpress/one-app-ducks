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

export const SET_DANGEROUSLY_DISABLE_SCRIPTS = `${typeScope}/render/SET_DANGEROUSLY_DISABLE_SCRIPTS`;
export const SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES = `${typeScope}/render/SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES`;
export const SET_RENDER_PARTIAL_ONLY = `${typeScope}/render/SET_RENDER_PARTIAL_ONLY`;
export const SET_RENDER_TEXT_ONLY = `${typeScope}/render/SET_RENDER_TEXT_ONLY`;

export const initialState = fromJS({
  disableStyles: false,
  disableScripts: false,
  renderPartialOnly: false,
  renderTextOnly: false,
  renderTextOnlyOptions: { htmlTagReplacement: '', allowedHtmlTags: [] },
});
// eslint-disable-next-line default-param-last -- reducers have default params first
export default function reducer(state = initialState, action) {
  switch (action.type) {
    case SET_DANGEROUSLY_DISABLE_SCRIPTS:
      return state.set('disableScripts', action.disableScripts);
    case SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES:
      return state
        .set('disableStyles', action.disableScriptsAndStyles)
        .set('disableScripts', action.disableScriptsAndStyles);
    case SET_RENDER_PARTIAL_ONLY:
      return state.set('renderPartialOnly', action.renderPartialOnly);
    case SET_RENDER_TEXT_ONLY:
      return state.withMutations((newState) => newState
        .set('renderTextOnly', action.renderTextOnly)
        .setIn(['renderTextOnlyOptions', 'htmlTagReplacement'], action.options.htmlTagReplacement)
        .setIn(['renderTextOnlyOptions', 'allowedHtmlTags'], action.options.allowedHtmlTags));
    default:
      return state;
  }
}

export const setDangerouslyDisableScripts = (disableScripts) => ({
  type: SET_DANGEROUSLY_DISABLE_SCRIPTS,
  disableScripts,
});

export const setDangerouslyDisableScriptsAndStyles = (disableScriptsAndStyles) => ({
  type: SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES,
  disableScriptsAndStyles,
});

export const setRenderPartialOnly = (renderPartialOnly) => ({
  type: SET_RENDER_PARTIAL_ONLY,
  renderPartialOnly,
});

export const setRenderTextOnly = (renderTextOnly, options) => ({
  type: SET_RENDER_TEXT_ONLY,
  renderTextOnly,
  options: { htmlTagReplacement: '', allowedHtmlTags: [], ...options },
});
