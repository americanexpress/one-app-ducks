/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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
import { getModuleMap } from 'holocron';

import { getModuleBaseUrl } from '../../src/utils/modules';

jest.mock('holocron');

describe('getModuleBaseUrl', () => {
  function mockGetModuleMapBaseUrl(moduleName, baseUrl) {
    getModuleMap.mockImplementationOnce(() => fromJS({
      modules: {
        [moduleName]: {
          baseUrl,
        },
      },
    }));
  }

  it('should get the baseUrl for a module with a trailing slash and normalizes it', () => {
    const moduleName = 'my-module';
    const moduleBaseUrl = `https://example.com/modules/${moduleName}/1.0.0/`;
    mockGetModuleMapBaseUrl(moduleName, moduleBaseUrl);

    expect(getModuleBaseUrl(moduleName)).toEqual(moduleBaseUrl.slice(0, -1));
  });

  it('should get the baseUrl for a module without a trailing slash', () => {
    const moduleName = 'my-module';
    const moduleBaseUrl = `https://example.com/modules/${moduleName}/1.1.1`;
    mockGetModuleMapBaseUrl(moduleName, moduleBaseUrl);

    expect(getModuleBaseUrl(moduleName)).toEqual(moduleBaseUrl);
  });
});
