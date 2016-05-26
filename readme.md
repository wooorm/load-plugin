# load-plugin [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

<!-- lint disable heading-increment -->

Load a submodule / plugin.  Accepts a string and looks for files,
directories, node modules, optionally global packages too.

## Installation

[npm][npm-install]:

```bash
npm install load-plugin
```

## Usage

Say we have the following project:

```txt
project
|-- node_modules
|   |-- load-plugin
|-- package.json
|-- example
    |-- index.js
```

Where `example/index.js` looks as follows:

```javascript
var loadPlugin = require('load-plugin');

console.log(loadPlugin('foo', {prefix: 'bar'}));
```

And the script is run:

```sh
cd example
node index.js
```

The following paths are checked, in order:

```txt
project/node_modules/bar-foo
project/example/node_modules/bar-foo
project/foo
project/foo.js
project/node_modules/foo
project/example/node_modules/foo
```

And an error is throw because `foo` isn’t found :worried:

```txt
module.js:440
    throw err;
    ^

Error: Cannot find module 'foo'
    at Function.Module._resolveFilename (module.js:438:15)
    at Function.Module._load (module.js:386:25)
    at Module.require (module.js:466:17)
    at require (internal/module.js:20:19)
    at loadPlugin (~/project/node_modules/load-plugin/index.js:126:12)
    at Object.<anonymous> (~/project/example/index.js:3:13)
    at Module._compile (module.js:541:32)
    at Object.Module._extensions..js (module.js:550:10)
    at Module.load (module.js:456:32)
    at tryModuleLoad (module.js:415:12)
```

## API

### `loadPlugin(name[, options])`

Try to load `name`. [See how »][algorithm].

###### Options

*   `prefix` (`string`, optional)
    — Prefix to search for;

*   `cwd` (`string`, optional, defaults to `process.cwd()`)
    — Place to search in;

*   `global` (`boolean`, optional, defaults to whether global is detected)
    — Whether to look for `name` in [global places][global].
    If this is nully, `load-plugin` will detect if it’s currently
    running in global mode: either because it’s in Electron, or because
    a globally installed package is running it.

###### Returns

The results of `require`ing the first path that exists.

###### Throws

If `require`ing an existing path fails, or if no existing path exists.

## Algorithm

Looks in the following paths:

*   `$root/node_modules/$plugin` — If `prefix` is given;
*   `$cwd/node_modules/$plugin` — If `prefix` is given;
*   `$modules/$plugin` — If `prefix` is given and in `global` mode;
*   `$root/$name`;
*   `$root/$name.js`;
*   `$root/node_modules/$name`;
*   `$cwd/node_modules/$name`;
*   `$modules/$name` — If in `global` mode.

Where:

*   `$cwd` — Directory to search from (configurable);

*   `$root` — Ancestral directory of `$cwd`, with a `package.json`;

*   `$name` — Given `name`;

*   `$plugin` — When `prefix` is given, `prefix` and `name`
    joined together with a hyphen;

*   `$modules` — Location of globally installed npm packages.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/wooorm/load-plugin.svg

[travis]: https://travis-ci.org/wooorm/load-plugin

[codecov-badge]: https://img.shields.io/codecov/c/github/wooorm/load-plugin.svg

[codecov]: https://codecov.io/github/wooorm/load-plugin

[npm-install]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[global]: https://docs.npmjs.com/files/folders#node-modules

[algorithm]: #algorithm
