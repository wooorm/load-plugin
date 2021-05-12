'use strict'

/**
 * @typedef {object} Options
 * @property {string} [prefix]
 * @property {string | string[]} [cwd]
 * @property {boolean} [global]
 */

var fs = require('fs')
var path = require('path')
var resolveFrom = require('resolve-from')
var libNpmConfig = require('libnpmconfig')

module.exports = loadPlugin
loadPlugin.resolve = resolvePlugin

var electron = process.versions.electron !== undefined
var windows = process.platform === 'win32'

var argv = process.argv[1] || /* c8 ignore next */ ''
var nvm = process.env.NVM_BIN
var appData = process.env.APPDATA

/* c8 ignore next */
var globalsLibrary = windows ? '' : 'lib'

/** @type {{prefix?: string}} */
var builtinNpmConfig

// The prefix config defaults to the location where node is installed.
// On Windows, this is in a place called `%AppData%`, which we have to
// pass to `libnpmconfig` explicitly:
/* c8 ignore next 4 */
if (windows && appData) {
  builtinNpmConfig = {prefix: path.join(appData, 'npm')}
}

/**
 * Note: `libnpmconfig` uses `figgy-pudding` which is slated for archival.
 * Either `libnpmconfig` will switch to an alternative or we’ll have to.
 * @type {string}
 */
var npmPrefix = libNpmConfig.read(null, builtinNpmConfig).prefix

// If there is no prefix defined, use the defaults
// See: <https://github.com/eush77/npm-prefix/blob/master/index.js>
/* c8 ignore next 5 */
if (!npmPrefix) {
  npmPrefix = windows
    ? path.dirname(process.execPath)
    : path.resolve(process.execPath, '../..')
}

var globalsDefault = electron || argv.indexOf(npmPrefix) === 0
var globalDir = path.resolve(npmPrefix, globalsLibrary, 'node_modules')

// If we’re in Electron, we’re running in a modified Node that cannot really
// install global node modules.
// To find the actual modules, the user has to set `prefix` somewhere in an
// `.npmrc` (which is picked up by `libnpmconfig`).
// Most people don’t do that, and some use NVM instead to manage different
// versions of Node.
// Luckily NVM leaks some environment variables that we can pick up on to try
// and detect the actual modules.
/* c8 ignore next 3 */
if (electron && nvm && !fs.existsSync(globalDir)) {
  globalDir = path.resolve(nvm, '..', globalsLibrary, 'node_modules')
}

/**
 *  Load the plugin found using `resolvePlugin`.
 *
 * @param {string} name The name to import.
 * @param {Options} [options]
 * @returns {Promise.<unknown>}
 */
async function loadPlugin(name, options) {
  var fp = await resolvePlugin(name, options)
  return require(fp || name)
}

/**
 * Find a plugin.
 *
 * See also:
 * *   https://docs.npmjs.com/files/folders#node-modules
 * *   https://github.com/sindresorhus/resolve-from
 *
 * Uses the standard node module loading strategy to find `$name` in each given
 * `cwd` (and optionally the global `node_modules` directory).
 *
 * If a prefix is given and `$name` is not a path, `$prefix-$name` is also
 * searched (preferring these over non-prefixed modules).
 *
 * @param {string} name
 * @param {Options} [options]
 * @returns {Promise.<string|null>}
 */
function resolvePlugin(name, options = {}) {
  var prefix = options.prefix
  var cwd = options.cwd
  var globals =
    options.global === undefined || options.global === null
      ? globalsDefault
      : options.global
  var scope = ''
  var sources = Array.isArray(cwd) ? cwd.concat() : [cwd || process.cwd()]
  /** @type {string} */
  var plugin
  /** @type {number} */
  var slash
  /** @type {Array.<[string, string]>} */
  var tries = []

  // Non-path.
  if (name.charAt(0) !== '.') {
    if (globals) {
      sources.push(globalDir)
    }

    // Unprefix module.
    if (prefix) {
      prefix = prefix.charAt(prefix.length - 1) === '-' ? prefix : prefix + '-'

      // Scope?
      if (name.charAt(0) === '@') {
        slash = name.indexOf('/')

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

  var index = -1
  while (++index < sources.length) {
    if (plugin) tries.push([sources[index], plugin])
    tries.push([sources[index], name])
  }

  return new Promise(executor)

  /**
   * @param {(value: string) => void} resolve
   * @param {(reason: Error) => void} reject
   */
  function executor(resolve, reject) {
    var attempt = tries.shift()
    var fp = resolveFrom.silent(attempt[0], attempt[1])

    if (fp) {
      resolve(fp)
    } else if (tries.length === 0) {
      resolve(null)
    } else {
      executor(resolve, reject)
    }
  }
}
