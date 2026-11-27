# load-plugin

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]

Load a submodule, plugin, or file.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`LoadOptions`](#loadoptions)
  * [`ResolveOptions`](#resolveoptions)
  * [`loadPlugin(name[, options])`](#loadpluginname-options)
  * [`resolvePlugin(name[, options])`](#resolvepluginname-options)
* [Algorithm](#algorithm)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is useful when you want to load plugins.
It resolves and imports modules like Node.js does with some extras.
For example,
it can add a prefix to names
(when given a prefix `remark` and the user-provided value `gfm`,
it finds `remark-gfm`),
search from several places,
and search global `node_modules` folders.

## When should I use this?

You can use this when users configure your tool with plugins.
For example,
`remark-cli` uses it to load remark plugins named in configuration files.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npmjs-install]:

```sh
npm install load-plugin
```

## Use

Say we’re in this project (with dependencies installed):

```js
import {loadPlugin, resolvePlugin} from 'load-plugin'

console.log(await resolvePlugin('lint', {prefix: 'remark'}))
// => 'file:///Users/tilde/Projects/oss/load-plugin/node_modules/remark-lint/index.js'

console.log(
  await resolvePlugin('validator-identifier', {prefix: '@babel/helper'})
)
// => 'file:///Users/tilde/Projects/oss/load-plugin/node_modules/@babel/helper-validator-identifier/lib/index.js'

console.log(await resolvePlugin('./index.js', {prefix: 'remark'}))
// => 'file:///Users/tilde/Projects/oss/load-plugin/index.js'

console.log(await loadPlugin('lint', {prefix: 'remark'}))
// => [Function: remarkLint]
```

## API

This package exports the identifiers
[`loadPlugin`][api-load-plugin] and
[`resolvePlugin`][api-resolve-plugin].
There is no default export.
It exports the additional [TypeScript][] types
[`LoadOptions`][api-load-options] and
[`ResolveOptions`][api-resolve-options].

### `LoadOptions`

Configuration for [`loadPlugin`][api-load-plugin] (TypeScript type).

Includes the fields of [`ResolveOptions`][api-resolve-options].

###### Fields

* `key` (`boolean` or `string`, default: `'default'`)
  — identifier to take from the exports;
  for example when given `'x'`,
  the value of `export const x = 1` is returned;
  when given `'default'`,
  the value of `export default …` is returned;
  when `false`,
  the whole module object is returned

### `ResolveOptions`

Configuration for [`resolvePlugin`][api-resolve-plugin] (TypeScript type).

###### Fields

* `from` (`Array<URL | string> | URL | string`, optional)
  — place or places to search from;
  defaults to the current working directory
* `global` (`boolean`, default: whether global is detected)
  — whether to also search [global `node_modules`][npmjs-node-modules];
  when nullish,
  global mode is detected:
  it is on when running in Electron or from a globally installed package;
  note that Electron runs its own Node instead of your system Node,
  so global packages cannot be found,
  unless you set a [`prefix`][npmjs-prefix] in your `.npmrc` or use
  [nvm][github-nvm] to manage your system Node
* `prefix` (`string`, optional)
  — prefix to search for

### `loadPlugin(name[, options])`

Import `name` from `from` (and optionally the global `node_modules`
folder).

See [Algorithm][] for how `name` is resolved.

###### Parameters

* `name` (`string`, required)
  — specifier
* `options` ([`LoadOptions`][api-load-options], optional)
  — configuration

###### Returns

Promise to a whole module or specific export (`Promise<unknown>`).

### `resolvePlugin(name[, options])`

Resolve `name` from `from` (and optionally the global `node_modules`
folder).

See [Algorithm][] for how `name` is resolved.

###### Parameters

* `name` (`string`, required)
  — specifier
* `options` ([`ResolveOptions`][api-resolve-options], optional)
  — configuration

###### Returns

Promise to a file URL (`Promise<string>`).

## Algorithm

Names are resolved with the Node.js
[resolution algorithm][nodejs-esm-resolution]
(through [`import-meta-resolve`][github-import-meta-resolve])
to CJS and ESM packages and files.
Each place in `from` is tried in order.
When `global` is on and `name` is not a path,
the global `node_modules` folder is tried last.

When a `prefix` is given and `name` is not a path,
`$prefix-$name` is also searched,
and preferred over `name` in each place.
When `name` starts with a scope (`@scope/name`),
the prefix is added after it: `@scope/$prefix-name`.
A `name` that already starts with the prefix is not prefixed again.

## Compatibility

This package is compatible with maintained versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`load-plugin@6`,
compatible with Node.js 16.

## Security

This package reads the file system and imports modules,
which runs that code.

## Related

* [`wooorm/import-meta-resolve`][github-import-meta-resolve]
  — resolve things like Node.js does

## Contribute

Yes please!
See [How to Contribute to Open Source][opensource-guide-contribute].

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[algorithm]: #algorithm

[api-load-options]: #loadoptions

[api-load-plugin]: #loadpluginname-options

[api-resolve-options]: #resolveoptions

[api-resolve-plugin]: #resolvepluginname-options

[badge-build-image]: https://github.com/wooorm/load-plugin/workflows/main/badge.svg

[badge-build-url]: https://github.com/wooorm/load-plugin/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/wooorm/load-plugin.svg

[badge-coverage-url]: https://codecov.io/github/wooorm/load-plugin

[badge-downloads-image]: https://img.shields.io/npm/dm/load-plugin.svg

[badge-downloads-url]: https://www.npmjs.com/package/load-plugin

[file-license]: license

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-import-meta-resolve]: https://github.com/wooorm/import-meta-resolve

[github-nvm]: https://github.com/nvm-sh/nvm

[nodejs-esm-resolution]: https://nodejs.org/api/esm.html#esm_resolution_algorithm

[npmjs-install]: https://docs.npmjs.com/cli/install

[npmjs-node-modules]: https://docs.npmjs.com/cli/configuring-npm/folders#node-modules

[npmjs-prefix]: https://docs.npmjs.com/cli/using-npm/config

[opensource-guide-contribute]: https://opensource.guide/how-to-contribute/

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
