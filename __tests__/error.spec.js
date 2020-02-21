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
import { addErrorToReport } from '../src/errorReporting';

// Module under test
import reducer, {
  applicationError,
  clearError,
  APPLICATION_ERROR,
} from '../src/error';

jest.mock('../src/errorReporting', () => ({
  addErrorToReport: jest.fn((error, otherData) => ({
    type: 'ADD_ERROR_TO_REPORT',
    error,
    otherData,
  })),
}));

describe('error duck', () => {
  const dispatch = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('reducer', () => {
    it('default action', () => {
      const state = fromJS({ data: 'data' });
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(state, action).toJS()).toEqual(state.toJS());
    });

    it('application error action', () => {
      const oldState = fromJS({});
      const newState = { code: '500' };
      const action = {
        type: APPLICATION_ERROR,
        code: '500',
      };
      expect(reducer(oldState, action).toJS()).toEqual(newState);
    });

    it('should clear the application error from state', () => {
      const oldState = fromJS({ code: '500 ' });
      expect(reducer(oldState, clearError()).toJS()).toEqual({});
    });

    it('should use default state', () => {
      expect(reducer(undefined, clearError()).toJS()).toEqual({});
    });
  });

  describe('applicationError', () => {
    it('should dispatch an APPLICATION_ERROR', () => {
      applicationError('500')(dispatch);
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenCalledWith({
        type: APPLICATION_ERROR,
        code: '500',
      });
    });

    it('should include a default error if none is provided', () => {
      applicationError('500')(dispatch);
      const err = new Error('application error');
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenCalledWith(addErrorToReport(err, JSON.stringify({
        code: '500',
        collectionMethod: 'applicationError',
      })));
    });

    it('should report an error if it is included', () => {
      const err = new Error('test error');
      const otherData = { foo: 'bar' };
      applicationError('500', err, otherData)(dispatch);
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(addErrorToReport).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(addErrorToReport(err, JSON.stringify({
        ...otherData,
        code: '500',
        collectionMethod: 'applicationError',
      })));
    });
  });
});
