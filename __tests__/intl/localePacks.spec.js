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

/* eslint-disable no-underscore-dangle */

import fs from 'fs';
import path from 'path';
import Intl from 'lean-intl';
import clientLocalePacks from '../../lib/intl/localePacks.client';
import serverLocalePacks from '../../lib/intl/localePacks.node';

global.Intl = Intl;

jest.mock('lean-intl', () => {
  const realIntl = jest.requireActual('lean-intl');
  return {
    ...realIntl,
    __addLocaleData: jest.fn(realIntl.__addLocaleData),
  };
});

describe('localePacks', () => {
  const locales = fs
    .readdirSync(path.join(require.resolve('lean-intl'), '../..', 'locale-data', 'json'))
    .map((locale) => locale.slice(0, -5));

  // Validate we're really getting the locales
  expect(locales.length).toBe(787);

  beforeEach(() => jest.clearAllMocks());

  it('should export an object of functions for every intl locale', () => {
    const objectToMatch = locales.reduce((acc, locale) => ({
      ...acc,
      [locale]: expect.any(Function),
    }), {});
    expect(clientLocalePacks).toEqual(objectToMatch);
    expect(serverLocalePacks).toEqual(objectToMatch);
  });

  it('should export an object of functions that load the intl data', async () => {
    expect.assertions(2);
    const locale = locales[0];
    // eslint-disable-next-line import/no-dynamic-require
    const localeData = require(`lean-intl/locale-data/json/${locale}.json`);
    // TODO: update babel & jest so client locale packs can be tested
    // const clientResult = await clientLocalePacks[locale]();
    // expect(clientResult).toBe(localeData);
    await serverLocalePacks[locale]();
    expect(Intl.__addLocaleData).toHaveBeenCalledTimes(1);
    expect(Intl.__addLocaleData).toHaveBeenCalledWith(localeData);
  });

  it('should export an object of async functions', async () => {
    expect.assertions(1);
    const locale = locales[0];
    // TODO: update babel & jest so client locale packs can be tested
    // expect(clientLocalePacks[locale]()).toBeInstanceOf(Promise);
    expect(serverLocalePacks[locale]()).toBeInstanceOf(Promise);
  });
});
