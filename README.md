<h1>
  <center>
    <br />
    <img src="./one-app-ducks.png" alt="One App Ducks - One Amex" width="50%" />
    <br /><br />
  </center>
</h1>

> [Redux](https://redux.js.org/) [ducks](https://github.com/erikras/ducks-modular-redux) used within the One App ecosystem.

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app-ducks`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [API](#-api)
* [Contributing](#-contributing)

## ✨ Features

* Combine your reducers with the global reducers within the One App ecosystem.

## 🤹‍ Usage

### Installation

```bash
npm i @americanexpress/one-app-ducks
```

#### How to use

```js
import { combineReducers, createStore } from 'redux';
import globalReducers from '@americanexpress/one-app-ducks';

// See "reducers" section of this document for more info
const appReducer = combineReducers({
  ...globalReducers,
  ...otherReducers, // Your specific reducers
});

const store = createStore(
  appReducer
);

```

## 🎛️ API

### `reducers`

The default export is an object of reducers meant to be included in a call to
Redux's [`combineReducers`](https://redux.js.org/api/combinereducers) when
setting up the store. Included reducers are `browser`, `error`, `errorReporting`, `intl`,`redirection` and `rendering`.

```js
import { combineReducers } from 'redux';
import globalReducers from '@americanexpress/one-app-ducks';

const appReducer = combineReducers({
  ...globalReducers,
  ...otherReducers, // Your specific reducers
});

```

### `browser`

#### `getCookies`

This [selector](https://github.com/reduxjs/reselect) can be used to access
cookies both on the server and the client.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `state` | `Object` | (required) current state of the your application |

#### `setUserAgent`

This action creator can be used to set the [user-Agent](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent).

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `user-Agent` | `String` | (required) user-Agent to be set |

```js
import { setUserAgent } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(setUserAgent('curl/7.35.0?'));

```

#### `setOrigin`

This action creator can be used to set the [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin).

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `Origin` | `String` | (required) Origin to be set |

```js
import { setOrigin } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(setOrigin('https://example.com'));

```

### `errors`

#### `applicationError`

This action creator will put the application in an error state and afterwards
 `addErrorToReport` is dispatched.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `code` | `Number` | (required) This is the error code to set e.g 500, 401 refer to [this](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)|

```js
import { applicationError } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(applicationError(500));
```

#### `clearError()`

This action creator can be used to clear the error state.

```js
import { clearError } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(clearError());
```

### `errorReporting`

#### `addErrorToReport`

This action creator is for reporting both client side and server side errors
to your server logs.
The reports are posted to the url configured here `state.getIn(['config', 'errorReportingUrl'])`.

This action creator can take the following arguments:

| Argument | Type | Description |
|---|---|---|
| `error` | `Object` | (required) This is the error stack |
| `otherData` | `Object` | This is any other data that you'd like to send alongside the error message|

```js
import { addErrorToReport } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(addErrorToReport(error, {
  collectionMethod: 'componentDidCatch',
  moduleID: 'my-module',
}));
```

#### `sendErrorReport()`

This action creator is used to send any pending error reports. You can use this along side
`applicationError` to post your own custom errors.

```js
import { sendErrorReport } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(sendErrorReport());

```

### `intl`

This refers to internationalization.

#### `loadLanguagePack`

An async action creator for fetching your module's language pack.
This action creator can take the following arguments:

| Argument | Type | Description |
|---|---|---|
| `moduleName` | `String` | (required) Gets the language pack for the module specified. |
| `givenLocale` | `String` | Gets the language pack for the given locale, as opposed to the locale in state. |
| `force` | `String` | Force fetches the language pack if you don't want to use what is in state  |
| `fallbackLocale` | `String` | If the language pack does not exist, fetches this lang pack instead.  |

```js

import { loadLanguagePack } from '@americanexpress/one-app-ducks';

// ...

export default holocronModule({
  name: 'my-module',
  load: () => (dispatch) => dispatch(loadLanguagePack('my-module', null, null, 'en-US')),
})(MyModule);
```

#### `queryLanguagePack`

`queryLanguagePack` is the [iguazu](https://github.com/americanexpress/iguazu)
equivalent for `loadLanguagePack`. A fallback locale can be provided if there is
a language pack you'd like to fallback to in case that the requested
language pack is not available.

This action creator can take the following arguments:

| Argument | Type | Description |
|---|---|---|
| `moduleName` | `String` | (required) Gets the language pack for the module specified. |
| `fallbackLocale` | `String` | If the language pack does not exist, fetches this lang pack instead.  |

```js
import { queryLanguagePack } from '@americanexpress/one-app-ducks';

// ...

const loadDataAsProps = ({ store: { dispatch } }) => ({
  langPack: () => dispatch(queryLanguagePack('my-module', { fallbackLocale: 'en-US' })),
});
```

#### `updateLocale`

This action creator is used to set the active locale for One App.
The promise will resolve once the
locale bundle (containing locale data for `Intl.js`,
[`React Intl`](https://www.npmjs.com/package/react-intl)) and
[`Moment.js`](http://momentjs.com/)) is loaded and the active locale is set. It will reject if [Lean-Intl](https://github.com/sebastian-software/lean-intl) does not have a bundle for the locale.

The locale bundles don't need to be an exact match. For instance setting the
locale to `'en-XA'` will load `i18n/en.js` and `'zh-Hans-XB'` will load
`i18n/zh-Hans.js`.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `locale` | `String` | (required) Locale provided |

``` js
import { updateLocale } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(updateLocale('be-BY'));

```

#### `getLocalePack`

Similar to `updateLocale`, but will attempt to load the locale of the requested country that is closest to the current active locale.

This action creator can take the following argument:

| prop name | type | value |
|---|---|---|
| `locale` | `String` | (required) Locale provided |

```js
import { getLocalePack } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(getLocalePack('en-GB'));

```

### `redirection`

#### `externalRedirect()`

This action creator can be used to redirect a user out of your one app instance either on the server (via 302 response) or on the client.

```js
import { externalRedirect } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(externalRedirect('https://example.com'));

```

### `rendering`

#### `setRenderPartialOnly()`

Use this action creator to render static markup from a holocron module, rather than a complete page.

```js
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderPartialOnly(true));
```

#### `setDangerouslyDisableScripts()`

Use this action creator to disable scripts for being added to the rendered page.

```js
import { setDangerouslyDisableScripts } from '@americanexpress/one-app-ducks';

// ...

dispatch(setDangerouslyDisableScripts(true));
```

#### `setDangerouslyDisableScriptsAndStyles()`

Use this action creator to disable scripts and styles for being added to the rendered page.

```js
import { setDangerouslyDisableScriptsAndStyles } from '@americanexpress/one-app-ducks';

// ...

dispatch(setDangerouslyDisableScriptsAndStyles(true));
```

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/one-app-ducks).

Please feel free to open pull requests and see [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to get started contributing.

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](./LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
