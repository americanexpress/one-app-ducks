<!--ONE-DOCS-HIDE start-->

<h1 align="center">
  <img src='https://github.com/americanexpress/one-app-ducks/raw/main/one-app-ducks.png' alt="One App Ducks - One Amex" width='50%'/>
</h1>

[![npm](https://img.shields.io/npm/v/@americanexpress/one-app-ducks)](https://www.npmjs.com/package/@americanexpress/one-app-ducks)
![Health Check](https://github.com/americanexpress/one-app-ducks/workflows/Health%20Check/badge.svg)

> [Redux](https://redux.js.org/) [ducks](https://github.com/erikras/ducks-modular-redux) used within
> the One App ecosystem.

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app-ducks`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [API](#%EF%B8%8F-one-app-ducks-api)
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
import { combineReducers } from 'redux-immutable';
import { createStore } from 'redux';
import globalReducers from '@americanexpress/one-app-ducks';

const appReducer = combineReducers({
  ...globalReducers,
  ...otherReducers, // Your specific reducers
});

const store = createStore(
  appReducer
);
```
<!--ONE-DOCS-HIDE end-->

<!--ONE-DOCS-METADATA title="One App Ducks API" tags="one app ducks,redux,reducers,one app" -->

## 🎛️ One App Ducks API

### Overview

[Ducks](https://github.com/erikras/ducks-modular-redux) include the reducer, selectors and action
creators for a given branch of state. These ducks make up the core of One App's state.

The default export is an object of reducers meant to be included in a call to Redux immutable's
[`combineReducers`](https://redux.js.org/api/combinereducers) when setting up the store. Included
reducers are `browser`, `error`, `errorReporting`, `intl`, `redirection` and `rendering`.

**Contents:**

- [`browser`](#browser-duck)
- [`error`](#error-duck)
- [`errorReporting`](#errorreporting-duck)
- [`intl`](#intl-duck)
- [`redirection`](#redirection-duck)
- [`rendering`](#rendering-duck)

<!--ONE-DOCS-ID id="browser-duck" start-->

### `browser` Duck

This duck is for reading information about the user's browser. It is particularly helpful on the
server where this information is not readily available.

**Contents:**

- [State Shape](#state-shape)
- [Selectors](#selectors)
  - [`getCookies`](#getCookies)
- [Action creators](#action-creators)
  - [`setUserAgent`](#setuseragent)
  - [`setOrigin`](#setorigin)

#### State Shape

```js
const state = new Map({
  browser: new Map({
    cookies: new Map({
      [cookieName]: String, // value for the cookie
    }),
    location: new Map({
      origin: String, // origin of the request
    }),
    userAgent: String, // UA string for the browser
  }),
  // ...
});
```

#### Selectors

##### `getCookies`

This [selector](https://github.com/reduxjs/reselect) can be used to access
cookies both on the server and the client.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `state` | `Object` | (required) current state of the your application |

```js
import { getCookies } from '@americanexpress/one-app-ducks';

// ...

const cookies = getCookies(store.getState());
```

#### Action Creators

##### `setUserAgent`

This action creator can be used to set the [User-Agent](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent).
It is used directly by One App, and it is unlikely that any module would need it.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `User-Agent` | `String` | (required) User-Agent to be set |

```js
import { setUserAgent } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(setUserAgent('curl/7.35.0?'));
```

##### `setOrigin`

This action creator can be used to set the [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin).
It is used directly by One App, and it is unlikely that any module would need it.

This action creator can take the following argument:

| Argument | Type | Description |
|---|---|---|
| `Origin` | `String` | (required) Origin to be set |

```js
import { setOrigin } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(setOrigin('https://example.com'));

```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-ID id="error-duck" start-->

### `error` Duck

The error duck tracks whether One App is in an error state and what the
[HTTP status code](https://www.restapitutorial.com/httpstatuscodes.html) is for the error.

**Contents:**

- [State Shape](#state-shape-1)
- [Action creators](#action-creators-1)
  - [`applicationError`](#applicationerror)
  - [`clearError`](#clearerror)

#### State Shape

```js
const state = new Map({
  error: new Map({
    code: Number, // HTTP error code (undefined if not set)
  }),
  // ...
});
```

#### Action creators

##### `applicationError`

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

##### `clearError`

This action creator can be used to clear the error code.

```js
import { clearError } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(clearError());
```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-ID id="errorReporting-duck" start-->

### `errorReporting` Duck

The error reporting duck is for sending client side errors to the `reportingUrl` configured by
the  environment variable `ONE_CLIENT_REPORTING_URL`. You can find more documentation on environment
variables for One App in the [One App documentation](https://github.com/americanexpress/one-app/blob/main/docs/api/server/Environment-Variables.md).
On the server the errors reported are simply logged with the assumption that the underlying
infrastructure will pick up those logs and ship them to where they can be better kept and analyzed.
Reported errors will have the following format:

```js
({
  msg: String, // Error message (error.message)
  stack: String, // Error stack (error.stack) IE >= 10
  href: String, // href to the page reporting the error (client side only)
  otherData: Object, // Any other data included when adding the error to the report
});
```

**Contents:**

- [State Shape](#state-shape-2)
- [Action creators](#action-creators-2)
  - [`addErrorToReport`](#adderrortoreport)
  - [`sendErrorReport`](#senderrorreport)

#### State Shape

```js
const state = new Map({
  errorReporting: new Map({
    queue: List, // Errors to report
    pending: List, // Errors that have been sent but have not returned a success response yet
    pendingPromise: Promise, // From the request that posted the pending errors
    retryWait: Number, // Time (ms) to wait before sending again after a failure
  }),
  // ...
});
```

#### Action creators

##### `addErrorToReport`

This action creator is for reporting both client side and server side errors
to your server logs.

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

##### `sendErrorReport`

This action creator is used to send any pending error reports. You can use this along side
`applicationError` to post your own custom errors.

```js
import { sendErrorReport } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(sendErrorReport());
```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-ID id="intl-duck" start-->

### `intl` Duck

The `intl` duck is for enabling internationalization. It is used to load the language packs bundled
with each module. See usage in the [`one-app-locale-bundler` README](https://github.com/americanexpress/one-app-cli/tree/main/packages/one-app-locale-bundler#-usage)
for details on how to include language packs in your module bundles.

**Contents:**

- [State Shape](#state-shape-3)
- [Action creators](#action-creators-3)
  - [`loadLanguagePack`](#loadlanguagepack)
  - [`queryLanguagePack`](#querylanguagepack)
  - [`updateLocale`](#updatelocale)
  - [`getLocalePack`](#getlocalepack)

#### State Shape

```js
const state = new Map({
  intl: new Map({
    activeLocale: String, // BCP47 code for the locale served to the user
    languagePacks: new Map({
      [locale]: new Map({
        [moduleName]: new Map({
          data: Map, // Contents of the module's language pack
          isLoading: Boolean, // Indicates if the language pack request is in flight
          error: Error, // Error from language pack fetch
          errorExpiration: Number, // Time for error to expire so that reload attempt can be made
          _loadedOnServer: Boolean, // Indicates if the language pack was initially loaded on the
          // server
          _pendingDeferredForceLoad: Boolean, // Indicates if the client side request of server
          // loaded language pack is pending
        }),
      }),
    }),
  }),
  // ...
});
```

#### Action creators

##### `loadLanguagePack`

An async action creator for fetching your module's language pack.
This action creator can take the following arguments:

| Argument | Type | Description |
|---|---|---|
| `moduleName` | `String` | (required) Gets the language pack for the module specified. |
| `options.locale` | `String` | Gets the language pack for the given locale, as opposed to the locale in state. |
| `options.url` | `String` | URL to fetch the language pack from if not using language packs generated via one-app-bundler |
| `options.force` | `String` | Force fetches the language pack if you don't want to use what is in state  |
| `options.fallbackLocale` | `String` | If the language pack does not exist, fetches this lang pack instead.  |
| `options.fallbackUrl` | `String` | URL to use for fallback locale if not using language packs generated with one-app-bundler |

```js
import { loadLanguagePack } from '@americanexpress/one-app-ducks';

// ...

export default holocronModule({
  name: 'my-module',
  load: () => (dispatch) => dispatch(loadLanguagePack('my-module', { locale: 'en-US' })),
})(MyModule);
```

##### `queryLanguagePack`

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

##### `updateLocale`

This action creator is used to set the active locale for One App.
The promise will resolve once the
locale bundle (containing locale data for `Intl.js`,
[`React Intl`](https://www.npmjs.com/package/react-intl)) and
[`Moment.js`](http://momentjs.com/)) is loaded and the active locale is set. It will reject if
[Lean-Intl](https://github.com/sebastian-software/lean-intl) does not have a bundle for the locale.

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

##### `getLocalePack`

Similar to `updateLocale`, but will attempt to load the locale of the requested country that is
closest to the current active locale. This is used directly by One App, and it is unlikely that any
module would need it.

This action creator can take the following argument:

| prop name | type | value |
|---|---|---|
| `locale` | `String` | (required) Locale provided |

```js
import { getLocalePack } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(getLocalePack('en-GB'));
```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-ID id="redirection-duck" start-->

### `redirection` Duck

The redirection duck is for managing redirection of users. It is particularly useful on the server
where it is used to send a [`302`](https://www.restapitutorial.com/httpstatuscodes.html) response.

**Contents:**

- [State Shape](#state-shape-4)
- [Action creators](#action-creators-4)
  - [`externalRedirect`](#externalredirect)

#### State Shape

```js
const state = new Map({
  redirection: new Map({
    destination: String, // Fully qualified external URL to redirect to
    redirectionInFlight: Boolean, // Indicates redirection has started
  }),
  // ...
});
```

#### Action creators

##### `externalRedirect`

This action creator can be used to redirect a user out of your one app instance either on the server
(via 302 response) or on the client.

| Argument | Type | Description |
|---|---|---|
| `redirectUrl` | `String` | (required) fully qualified URL to redirect the user to |

```js
import { externalRedirect } from '@americanexpress/one-app-ducks';

// ...

store.dispatch(externalRedirect('https://example.com'));
```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-ID id="rendering-duck" start-->

### `rendering` Duck

The rendering duck controls how the server renders the HTML page sent to the client.

**Contents:**

- [State Shape](#state-shape-5)
- [Action creators](#action-creators-5)
  - [`setRenderPartialOnly`](#setrenderpartialonly)
  - [`setRenderTextOnly`](#setrendertextOnly)
  - [`setDangerouslyDisableScripts`](#setdangerouslydisablescripts)
  - [`setDangerouslyDisableScriptsAndStyles`](#setdangerouslydisablescriptsandstyles)

#### State Shape

```js
const state = new Map({
  rendering: new Map({
    disableScripts: Boolean, // Indicates if script tags should be omitted from HTML response
    disableStyles: Boolean, // Indicates if style tags should be omitted from HTML response
    renderPartialOnly: Boolean, // Indicates if the response should return just the rendered HTML
    // from the matched module rather than a complete HTML page
    renderTextOnly: Boolean, // Indicates if HTML tags should be removed from the HTML response
    renderTextOnlyOptions: new Map({
      htmlTagReplacement: String, // Replace all html tags with the character passed to this option.
      allowedHtmlTags: List, // List of HTML tags that should not be removed from the HTML response
    }),
  }),
  // ...
});
```

#### Action creators

##### `setRenderPartialOnly`

Use this action creator to render static markup from a holocron module, rather than a complete page.

| Argument | Type | Description |
|---|---|---|
| `renderPartialOnly` | `Boolean` | (required) set whether a partial should be rendered or not |

```js
import { setRenderPartialOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderPartialOnly(true));
```

##### `setRenderTextOnly`

Use this action creator to render text only from a holocron module, rather than a HTML.

| Argument | Type | Description |
|---|---|---|
| `renderTextOnly` | `Boolean` | (required) set whether to return text instead of HTML |
| `options` | `Object` | Replace html tags with the character passed to this option i.e. '/n'. Defaults to empty string. |
| `options.htmlTagReplacement` | `String` | Replace html tags with the character passed to this option i.e. '/n'. Defaults to empty string. |
| `options.allowedHtmlTags` | `Array` | Comma separated list of HTML tags that are allowed to remain in the text response i.e. `['a','strong']`. Defaults to empty array. |

```js
import { setRenderTextOnly } from '@americanexpress/one-app-ducks';

// ...

dispatch(setRenderTextOnly(true, { htmlTagReplacement: '\n', allowedHtmlTags: ['a'] }));
```

##### `setDangerouslyDisableScripts`

Use this action creator to disable scripts for being added to the rendered page.

| Argument | Type | Description |
|---|---|---|
| `disableScripts` | `Boolean` | (required) set whether scripts should be disabled |

```js
import { setDangerouslyDisableScripts } from '@americanexpress/one-app-ducks';

// ...

dispatch(setDangerouslyDisableScripts(true));
```

##### `setDangerouslyDisableScriptsAndStyles`

Use this action creator to disable scripts and styles for being added to the rendered page.

| Argument | Type | Description |
|---|---|---|
| `disableScriptsAndStyles` | `Boolean` | (required) set whether both scripts and styles should be disabled |

```js
import { setDangerouslyDisableScriptsAndStyles } from '@americanexpress/one-app-ducks';

// ...

dispatch(setDangerouslyDisableScriptsAndStyles(true));
```

<!--ONE-DOCS-ID end-->

<!--ONE-DOCS-HIDE start-->

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

<!--ONE-DOCS-HIDE end-->
