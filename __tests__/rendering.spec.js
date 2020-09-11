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
  SET_DANGEROUSLY_DISABLE_SCRIPTS,
  SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES,
  SET_RENDER_PARTIAL_ONLY,
  SET_RENDER_TEXT_ONLY,
  initialState,
  setDangerouslyDisableScripts,
  setDangerouslyDisableScriptsAndStyles,
  setRenderPartialOnly,
  setRenderTextOnly,
} from '../src/rendering';

describe('rendering', () => {
  describe('reducer', () => {
    it('sets disableScripts flag on SET_DANGEROUSLY_DISABLE_SCRIPTS type', () => {
      const result = reducer(undefined, {
        type: SET_DANGEROUSLY_DISABLE_SCRIPTS,
        disableScripts: true,
      });

      expect(result.toJS()).toEqual({
        disableScripts: true,
        disableStyles: false,
        renderPartialOnly: false,
        renderTextOnly: { setTextOnly: false, htmlTagReplacement: '', allowedHtmlTags: [] },
      });
    });

    it('sets disableScripts and disableStyles flag on SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES type', () => {
      const result = reducer(undefined, {
        type: SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES,
        disableScriptsAndStyles: true,
      });

      expect(result.toJS()).toEqual({
        disableScripts: true,
        disableStyles: true,
        renderPartialOnly: false,
        renderTextOnly: { setTextOnly: false, htmlTagReplacement: '', allowedHtmlTags: [] },
      });
    });

    it('sets renderPartialOnly flag on SET_RENDER_PARTIAL_ONLY type', () => {
      const result = reducer(undefined, {
        type: SET_RENDER_PARTIAL_ONLY,
        renderPartialOnly: true,
      });

      expect(result.toJS()).toEqual({
        disableScripts: false,
        disableStyles: false,
        renderPartialOnly: true,
        renderTextOnly: { setTextOnly: false, htmlTagReplacement: '', allowedHtmlTags: [] },
      });
    });

    it('sets renderTextOnly flag on SET_RENDER_TEXT_ONLY type', () => {
      const result = reducer(undefined, {
        type: SET_RENDER_TEXT_ONLY,
        setTextOnly: true,
        htmlTagReplacement: '',
        allowedHtmlTags: [],
      });

      expect(result.toJS()).toEqual({
        disableScripts: false,
        disableStyles: false,
        renderPartialOnly: false,
        renderTextOnly: { setTextOnly: true, htmlTagReplacement: '', allowedHtmlTags: [] },
      });
    });

    it('sets renderTextOnly flag on SET_RENDER_TEXT_ONLY type and adds additional options', () => {
      const htmlTagReplacement = '\n';
      const allowedHtmlTags = ['<a>', '<p>'];
      const result = reducer(undefined, {
        type: SET_RENDER_TEXT_ONLY,
        setTextOnly: true,
        htmlTagReplacement,
        allowedHtmlTags,
      });

      expect(result.toJS()).toEqual({
        disableScripts: false,
        disableStyles: false,
        renderPartialOnly: false,
        renderTextOnly: { setTextOnly: true, htmlTagReplacement, allowedHtmlTags },
      });
    });

    it('returns initial state on invalid action', () => {
      const result = reducer(undefined, {
        type: 'INVALID_ACTION',
      });

      expect(result).toEqual(initialState);
    });
  });

  describe('actions', () => {
    describe('setDangerouslyDisableScripts', () => {
      it('returns action payload', () => {
        const disable = true;
        const result = setDangerouslyDisableScripts(disable);
        expect(result).toEqual({
          type: SET_DANGEROUSLY_DISABLE_SCRIPTS,
          disableScripts: disable,
        });
      });
    });

    describe('setDangerouslyDisableScriptsAndStyles', () => {
      it('returns action payload', () => {
        const disable = true;
        const result = setDangerouslyDisableScriptsAndStyles(disable);
        expect(result).toEqual({
          type: SET_DANGEROUSLY_DISABLE_SCRIPTS_AND_STYLES,
          disableScriptsAndStyles: disable,
        });
      });
    });

    describe('setRenderPartialOnly', () => {
      it('returns action payload', () => {
        const renderPartialOnly = true;
        const result = setRenderPartialOnly(renderPartialOnly);
        expect(result).toEqual({
          type: SET_RENDER_PARTIAL_ONLY,
          renderPartialOnly,
        });
      });
    });

    describe('setRenderTextOnly', () => {
      it('returns action payload', () => {
        const result = setRenderTextOnly(true, '\n', ['<a>', '<p>']);
        expect(result).toEqual({
          type: SET_RENDER_TEXT_ONLY,
          setTextOnly: true,
          htmlTagReplacement: '\n',
          allowedHtmlTags: ['<a>', '<p>'],
        });
      });
      it('returns action payload with default options for htmlTagReplacement and allowedHtmlTags', () => {
        const result = setRenderTextOnly(true);
        expect(result).toEqual({
          type: SET_RENDER_TEXT_ONLY,
          setTextOnly: true,
          htmlTagReplacement: '',
          allowedHtmlTags: [],
        });
      });
    });
  });
});
