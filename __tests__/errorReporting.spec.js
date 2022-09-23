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
import thunk from 'redux-thunk';
import { createStore, applyMiddleware } from 'redux';
import { combineReducers } from 'redux-immutable';
import configureStore from 'redux-mock-store';

// Module under test
import reducer, {
  serverSideError,
  addErrorToReport,
  sendErrorReport,
  formatErrorReport,
  ADD_ERROR_REPORT_TO_QUEUE,
  SEND_ERROR_REPORT_REQUEST,
  SEND_ERROR_REPORT_SUCCESS,
  SEND_ERROR_REPORT_FAILURE,
  SCHEDULE_ERROR_REPORT,
} from '../src/errorReporting';

describe('error reporting', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => 0);

  beforeEach(() => {
    consoleErrorSpy.mockClear();
    fetch.resetMocks();

    global.location = { href: 'about:blank' };
  });

  describe('reducer', () => {
    it('default action', () => {
      const state = { data: 'data' };
      const action = {
        type: 'UNRECOGNIZED_ACTION',
      };
      expect(reducer(fromJS(state), action).toJS()).toEqual(state);
    });

    it('should add new reports to the queue', () => {
      const oldState = fromJS({ queue: [] });
      const testError = new Error('test error');
      const action = {
        type: ADD_ERROR_REPORT_TO_QUEUE,
        error: new Error('test error'),
      };
      const newState = reducer(oldState, action).toJS();
      expect(newState.queue).toBeInstanceOf(Array);
      expect(newState.queue.length).toBe(1);
      const newStateReport = newState.queue[0];
      expect(newStateReport.msg).toEqual(testError.message);
      expect(newStateReport.otherData).toEqual(undefined);
      // skip if this platform doesn't support stacks
      if (testError.stack) {
        // the second level varies based on location it's accessed
        const newStateReportStack = newStateReport.stack.split('\n');
        const testErrorStack = testError.stack.split('\n');
        expect(newStateReportStack[0]).toEqual(testErrorStack[0]);
        expect(newStateReportStack.slice(2)).toEqual(testErrorStack.slice(2));
      }
    });

    it('should not add bad reports to the queue', () => {
      const oldState = { queue: [] };
      const action = {
        type: ADD_ERROR_REPORT_TO_QUEUE,
        something_unrelated: Math.random(),
      };
      expect(reducer(fromJS(oldState), action).toJS()).toEqual(oldState);
    });

    it('should add the request to the store', () => {
      const report = {
        msg: 'test report',
        stack: '1\n2\n3',
        otherData: undefined,
      };
      const oldState = {
        queue: [report],
        pending: [],
        pendingPromise: null,
      };
      const promise = Promise.resolve({ thankYou: true });
      const action = {
        type: SEND_ERROR_REPORT_REQUEST,
        promise,
      };
      const newState = {
        queue: [],
        pending: [report],
        pendingPromise: promise,
      };
      expect(reducer(fromJS(oldState), action).toJS()).toEqual(newState);
    });

    it('should remove pending reports when reporting succeeded', () => {
      const report = {
        msg: 'test report',
        stack: '1\n2\n3',
        otherData: undefined,
      };
      const data = { thankYou: true };
      const promise = Promise.resolve(data);
      const oldState = {
        queue: [],
        pending: [report],
        pendingPromise: promise,
        retryWait: 500,
      };
      const action = {
        type: SEND_ERROR_REPORT_SUCCESS,
        data,
        lastFetched: Date.now(),
      };
      const newState = {
        queue: [],
        pending: [],
        pendingPromise: null,
        retryWait: 500,
      };
      expect(reducer(fromJS(oldState), action).toJS()).toEqual(newState);
    });

    it('should add pending reports back to the queue when reporting failed', async () => {
      const report = {
        msg: 'test report',
        stack: '1\n2\n3',
        otherData: undefined,
      };
      const error = new Error('some network error');
      const promise = Promise.reject(error);
      const oldState = {
        queue: [],
        pending: [report],
        pendingPromise: promise,
        retryWait: 500,
      };
      const action = {
        type: SEND_ERROR_REPORT_FAILURE,
        error,
      };
      const expectedNewState = {
        queue: [report],
        pending: [],
        pendingPromise: null,
        // retryWait has a random element to it, so we'll skip it
      };

      const newState = reducer(fromJS(oldState), action).toJS();
      Object
        .keys(expectedNewState)
        .forEach((k) => expect(newState[k]).toEqual(expectedNewState[k]));

      // needed to handle the asynchronously rejected promise in this synchronous unit test
      // jest version 21.x.x and up no longer tolerate unhandled rejected promises
      // https://github.com/facebook/jest/issues/6028
      return promise.catch(() => 0);
    });

    it('should update the retry wait', async () => {
      const initialState = reducer(undefined, {});
      let resolvePendingPromise;
      const pendingPromise = new Promise((res) => { resolvePendingPromise = res; });
      const action = {
        type: SCHEDULE_ERROR_REPORT,
        promise: pendingPromise,
      };
      const state = reducer(initialState, action);
      expect(state.get('pendingPromise')).toBe(action.promise);
      expect(state.get('retryWait')).toBeGreaterThan(initialState.get('retryWait'));
      return resolvePendingPromise();
    });
  });

  describe('actions', () => {
    // eslint-disable-next-line max-len
    const mockStore = (initialState) => configureStore([thunk.withExtraArgument({ fetchClient: fetch })])(fromJS(initialState));
    beforeEach(() => { global.BROWSER = true; });

    it('should make a reporting network request', async () => {
      const queue = [
        {
          message: 'sample report',
          stack: '1\n2\n3',
        },
      ];
      const store = mockStore({
        config: fromJS({ reportingUrl: '/home' }),
        errorReporting: fromJS({
          queue,
          pending: [],
          pendingPromise: null,
        }),
      });

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      const data = await store.dispatch(sendErrorReport());
      const {
        type: errorReportRequestType,
        promise: errorReportRequestPromise,
      } = store.getActions()[0];

      const [requestData] = await errorReportRequestPromise;

      expect(store.getActions().length).toBe(2);
      expect(errorReportRequestType).toEqual(SEND_ERROR_REPORT_REQUEST);
      expect(requestData).toEqual({ thankYou: true });

      expect(store.getActions()[1].type).toEqual(SEND_ERROR_REPORT_SUCCESS);
      expect(data).toEqual({ thankYou: true });
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(queue);
      expect(fetch.mock.calls[0][1].method).toEqual('post');
      expect(
        fetch.mock.calls[0][1].headers['Content-Type']
      ).toEqual('application/json');
    });

    it('should retry a reporting network request', async () => {
      expect.assertions(3);

      const queue = [
        {
          message: 'sample report',
          stack: '1\n2\n3',
        },
      ];
      const promise = Promise.reject();
      const store = mockStore({
        config: fromJS({ reportingUrl: '/home' }),
        errorReporting: fromJS({
          queue,
          pending: [],
          pendingPromise: promise,
        }),
      });

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      await store.dispatch(sendErrorReport());
      expect(store.getActions().length).toBe(2);
      expect(store.getActions()[0].type).toEqual(SCHEDULE_ERROR_REPORT);
      expect(store.getActions()[1].type).toEqual(SEND_ERROR_REPORT_REQUEST);

      return promise.catch(() => 0);
    });

    it('should retry a reporting network request if response is not okay', async () => {
      expect.assertions(3);

      const queue = [
        {
          message: 'sample report',
          stack: '1\n2\n3',
        },
      ];
      const promise = Promise.reject();
      const store = mockStore({
        config: fromJS({ reportingUrl: '/home' }),
        errorReporting: fromJS({
          queue,
          pending: [],
          pendingPromise: promise,
        }),
      });

      fetch.mockResponseOnce(JSON.stringify({}), { ok: false, status: 500 });

      await store.dispatch(sendErrorReport());

      expect(store.getActions().length).toBe(2);
      expect(store.getActions()[0].type).toEqual(SCHEDULE_ERROR_REPORT);
      expect(store.getActions()[1].type).toEqual(SEND_ERROR_REPORT_REQUEST);

      await store.getActions()[1].promise.catch(() => 0);
      return promise.catch(() => 0);
    });

    it('should log instead making a reporting network request on the server', async () => {
      expect.assertions(6);
      global.BROWSER = false;
      const queue = [
        {
          message: 'sample report',
          stack: '1\n2\n3',
        },
      ];
      const store = mockStore({
        config: fromJS({ reportingUrl: '/home' }),
        errorReporting: fromJS({
          queue,
          pending: [],
          pendingPromise: null,
        }),
      });

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      const data = await store.dispatch(sendErrorReport());
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error());
      expect(store.getActions().length).toBe(2);
      expect(store.getActions()[0].type).toEqual(SEND_ERROR_REPORT_REQUEST);
      expect(store.getActions()[1].type).toEqual(SEND_ERROR_REPORT_SUCCESS);
      expect(data).toEqual({ thankYou: true });
      expect(fetch.mock.calls).toEqual([]);
    });

    it('should wait on a pending network request', async () => {
      expect.assertions(2);
      let resolvePendingPromise;
      const queue = [
        {
          message: 'sample report',
          stack: '1\n2\n3',
        },
      ];
      const pendingPromise = new Promise((res) => { resolvePendingPromise = res; });
      const store = mockStore({
        config: fromJS({ reportingUrl: '/home' }),
        errorReporting: fromJS({
          queue,
          pending: [],
          pendingPromise,
          resolvePendingPromise,
        }),
      });

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      store.dispatch(sendErrorReport());
      expect(store.getActions().length).toBe(0);
      resolvePendingPromise();

      await pendingPromise;
      expect(store.getActions()[0].type).toEqual(SEND_ERROR_REPORT_REQUEST);
    });

    it('should make a reporting network request after queuing a report', async () => {
      expect.assertions(4);
      const testError = {
        message: 'test error',
        stack: '1\n2\n3',
      };
      const otherData = { a: 1, b: 2 };

      const store = createStore(
        combineReducers({
          config: () => fromJS({ reportingUrl: '/home' }),
          errorReporting: reducer,
        }),
        applyMiddleware(thunk.withExtraArgument({ fetchClient: fetch }))
      );

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      const expectedReports = [
        {
          msg: testError.message,
          stack: testError.stack,
          href: 'about:blank',
          otherData,
        },
      ];

      const data = await store.dispatch(addErrorToReport(testError, otherData));
      expect(data).toEqual({ thankYou: true });
      expect(
        JSON.parse(fetch.mock.calls[0][1].body)
      ).toEqual(expectedReports);
      expect(fetch.mock.calls[0][1].method).toEqual('post');
      expect(
        fetch.mock.calls[0][1].headers['Content-Type']
      ).toEqual('application/json');
    });

    it('should make a reporting network request after queuing a report and handle an empty response', async () => {
      expect.assertions(3);
      const testError = {
        message: 'test error',
        stack: '1\n2\n3',
      };
      const otherData = { a: 1, b: 2 };

      const store = createStore(
        combineReducers({
          config: () => fromJS({ reportingUrl: '/home' }),
          errorReporting: reducer,
        }),
        applyMiddleware(thunk.withExtraArgument({ fetchClient: fetch }))
      );

      fetch.mockResponse();

      const expectedReports = [
        {
          msg: testError.message,
          stack: testError.stack,
          href: 'about:blank',
          otherData,
        },
      ];

      await store.dispatch(addErrorToReport(testError, otherData));
      expect(
        JSON.parse(fetch.mock.calls[0][1].body)
      ).toEqual(expectedReports);
      expect(fetch.mock.calls[0][1].method).toEqual('post');
      expect(
        fetch.mock.calls[0][1].headers['Content-Type']
      ).toEqual('application/json');
    });

    it('should not make a reporting network request if the queue is empty', async () => {
      expect.assertions(1);
      const store = createStore(
        combineReducers({
          config: () => fromJS({ reportingUrl: '/home' }),
          errorReporting: reducer,
        }),
        applyMiddleware(thunk.withExtraArgument({ fetchClient: fetch }))
      );

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      await store.dispatch(sendErrorReport());
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use the reportingUrl config', async () => {
      expect.assertions(2);

      const testError = { message: 'test error' };

      const errorReportingUrl = 'https://example.com/where/is/home';

      const store = createStore(
        combineReducers({
          config: () => fromJS({ reportingUrl: errorReportingUrl }),
          errorReporting: reducer,
        }),
        applyMiddleware(thunk.withExtraArgument({ fetchClient: fetch }))
      );

      fetch.mockResponseOnce(JSON.stringify({
        thankYou: true,
      }));

      const data = await store.dispatch(addErrorToReport(testError));
      const [resultingErrorReportingUrl] = fetch.mock.calls[0];

      expect(data).toEqual({ thankYou: true });
      expect(resultingErrorReportingUrl).toEqual(errorReportingUrl);
    });
  });

  describe('serverSideError', () => {
    it('should log the error', async () => {
      expect.assertions(2);
      const queue = [{
        msg: 'test error',
        stack: '1\n2\n3',
      }];
      await serverSideError(queue);
      const logged = console.error.mock.calls[0][0];
      expect(logged).toBeInstanceOf(Error);
      expect(logged).toHaveProperty('message');
    });

    it('should resolve similarly to the endpoint', async () => {
      expect.assertions(1);
      const response = await serverSideError([]);
      expect(response).toEqual({ thankYou: true });
    });
  });

  describe('formatErrorReport', () => {
    const testError = new Error('test error');

    it('should include the message and stack if an error is included', () => {
      const result = formatErrorReport(testError);
      expect(result.msg).toBe('test error');
      expect(result.stack).not.toBeUndefined();
    });

    it('should not throw if no error is included', () => {
      expect(() => formatErrorReport(undefined, { foo: 'bar' })).not.toThrow();
    });

    it('should include the href in the browser', () => {
      global.BROWSER = true;
      const result = formatErrorReport(testError);
      expect(result.href).toBe('about:blank');
    });

    it('should set href to undefined on the server', () => {
      global.BROWSER = false;
      const result = formatErrorReport(testError);
      expect(result.href).toBeUndefined();
    });

    it('should include other data given', () => {
      const otherData = { foo: 'bar' };
      const result = formatErrorReport(testError, otherData);

      expect(result.otherData).toBe(otherData);
    });
  });
});
