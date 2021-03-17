/**
 * @typedef {object} LoadPluginOptions
 * @property {string} [prefix]
 * @property {string | string[]} [cwd]
 * @property {boolean} [global]
 */

import fs from 'fs'
import path from 'path'
import {silent as resolve} from 'resolve-from'
// type-coverage:ignore-next-line
import {read as readNpmConfig} from 'libnpmconfig'

var electron = process.versions.electron !== undefined
var windows = process.platform === 'win32'

var argv = process.argv[1] || /* istanbul ignore next */ ''
var nvm = process.env.NVM_BIN
var appData = process.env.APPDATA

/* istanbul ignore next */
var globalsLibrary = windows ? '' : 'lib'

// type-coverage:ignore-next-line
var builtinNpmConfig

// The prefix config defaults to the location where node is installed.
// On Windows, this is in a place called `%AppData%`, which we have to
// pass to `libnpmconfig` explicitly:
/* istanbul ignore next */
if (windows && appData) {
  // type-coverage:ignore-next-line
  builtinNpmConfig = {prefix: path.join(appData, 'npm')}
}

var npmPrefix = readNpmConfig(null, builtinNpmConfig).prefix

// If there is no prefix defined, use the defaults
// See: <https://github.com/eush77/npm-prefix/blob/master/index.js>
/* istanbul ignore next */
if (!npmPrefix) {
  npmPrefix = windows
    ? path.dirname(process.execPath)
    : path.resolve(process.execPath, '../..')
}

var globally = electron || argv.indexOf(npmPrefix) === 0
var globals = path.resolve(npmPrefix, globalsLibrary, 'node_modules')

// If we’re in Electron, we’re running in a modified Node that cannot really
// install global node modules.
// To find the actual modules, the user has to set `prefix` somewhere in an
// `.npmrc` (which is picked up by `libnpmconfig`).
// Most people don’t do that, and some use NVM instead to manage different
// versions of Node.
// Luckily NVM leaks some environment variables that we can pick up on to try
// and detect the actual modules.
/* istanbul ignore next */
if (electron && nvm && !fs.existsSync(globals)) {
  globals = path.resolve(nvm, '..', globalsLibrary, 'node_modules')
}

/**
 *  Load the plugin found using `resolvePlugin`.
 *
 * @param {string} name The name to import.
 * @param {LoadPluginOptions} [options]
 * @returns {any}
 */
export default function loadPlugin(name, options) {
  return import(resolvePlugin(name, options) || name).then((m) => m.default)
}

/**
 * Find a plugin.
 *
 * See also:
 * *   https://docs.npmjs.com/files/folders#node-modules
 * *   https://github.com/sindresorhus/resolve-from
 *
 * Uses the standard node module loading strategy to find $name in each given
 * `cwd` (and optionally the global `node_modules` directory).
 *
 * If a prefix is given and $name is not a path, `$prefix-$name` is also
 * searched (preferring these over non-prefixed modules).
 *
 * @param {string} name
 * @param {LoadPluginOptions} [options]
 * @returns {string | null}
 */
export function resolvePlugin(name, options) {
  var settings = options || {}
  var prefix = settings.prefix
  var cwd = settings.cwd
  var global = settings.global
  /** @type string */
  var plugin
  var scope = ''

  if (global === null || global === undefined) {
    global = globally
  }

  var sources = Array.isArray(cwd) ? cwd.concat() : [cwd || process.cwd()]

  // Non-path.
  if (name.charAt(0) !== '.') {
    if (global) {
      sources.push(globals)
    }

    // Unprefix module.
    if (prefix) {
      prefix = prefix.charAt(prefix.length - 1) === '-' ? prefix : prefix + '-'

      // Scope?
      if (name.charAt(0) === '@') {
        var slash = name.indexOf('/')

        // Let’s keep the algorithm simple.
        // No need to care if this is a “valid” scope (I think?).
        // But we do check for the slash.
        if (slash !== -1) {
          scope = name.slice(0, slash + 1)
          name = name.slice(slash + 1)
        }
      }

      if (name.slice(0, prefix.length) !== prefix) {
        plugin = scope + prefix + name
      }

      name = scope + name
    }
  }

  var length = sources.length
  var index = -1

  while (++index < length) {
    var dir = sources[index]
    var filePath = (plugin && resolve(dir, plugin)) || resolve(dir, name)

    if (filePath) {
      return filePath
    }
  }

  return null
}
