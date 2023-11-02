/**
 * @typedef {LoadOptionsExtraFields & ResolveOptions} LoadOptions
 *   Configuration for `loadPlugin`.
 *
 * @typedef LoadOptionsExtraFields
 *   Extra configuration for `loadPlugin`.
 * @property {boolean | string | null | undefined} [key]
 *   Identifier to take from the exports (default: `'default'`);
 *   for example when given `'x'`,
 *   the value of `export const x = 1` will be returned;
 *   when given `'default'`,
 *   the value of `export default …` is used,
 *   and when `false` the whole module object is returned.
 *
 * @typedef ResolveOptions
 *   Configuration for `resolvePlugin`.
 * @property {string | null | undefined} [prefix]
 *   Prefix to search for (optional).
 * @property {ReadonlyArray<string> | string | null | undefined} [cwd]
 *   Place or places to search from (optional).
 * @property {boolean | null | undefined} [global=boolean]
 *   Whether to look for `name` in global places (default: whether global is
 *   detected);
 *   if this is nullish, `load-plugin` will detect if it’s currently running in
 *   global mode: either because it’s in Electron, or because a globally
 *   installed package is running it.
 *   note that Electron runs its own version of Node instead of your system
 *   Node,
 *   meaning global packages cannot be found, unless you’ve set-up a `prefix`
 *   in your `.npmrc` or are using nvm to manage your system node.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {fileURLToPath, pathToFileURL} from 'node:url'
// @ts-expect-error: untyped
import NpmConfig from '@npmcli/config'
import {resolve as importMetaResolve} from 'import-meta-resolve'

const electron = process.versions.electron !== undefined
const windows = process.platform === 'win32'

const argv = process.argv[1] || /* c8 ignore next -- windows */ ''
const nvm = process.env.NVM_BIN

/* c8 ignore next -- windows */
const globalsLibrary = windows ? '' : 'lib'

const config = new NpmConfig({
  definitions: {},
  npmPath: fileURLToPath(new URL('.', import.meta.url))
})

config.loadGlobalPrefix()

/** @type {string} */
let npmPrefix = config.globalPrefix

// If there is no prefix defined, use the defaults
// See: <https://github.com/eush77/npm-prefix/blob/master/index.js>
/* c8 ignore next 5 -- typically defined */
if (!npmPrefix) {
  npmPrefix = windows
    ? path.dirname(process.execPath)
    : path.resolve(process.execPath, '../..')
}

const defaultGlobal = electron || argv.indexOf(npmPrefix) === 0
/** @type {Readonly<LoadOptions>} */
const defaultLoadOptions = {}
/** @type {Readonly<ResolveOptions>} */
const defaultResolveOptions = {}

let globalDir = path.resolve(npmPrefix, globalsLibrary, 'node_modules')

// If we’re in Electron, we’re running in a modified Node that cannot really
// install global node modules.
// To find the actual modules, the user has to set `prefix` somewhere in an
// `.npmrc` (which is picked up by `libnpmconfig`).
// Most people don’t do that, and some use NVM instead to manage different
// versions of Node.
// Luckily NVM leaks some environment variables that we can pick up on to try
// and detect the actual modules.
/* c8 ignore next 10 -- Electron. */
if (electron && nvm) {
  try {
    await fs.stat(globalDir)
  } catch (error) {
    const cause = /** @type {NodeJS.ErrnoException} */ (error)
    if (cause && cause.code === 'ENOENT') {
      globalDir = path.resolve(nvm, '..', globalsLibrary, 'node_modules')
    }
  }
}

/**
 * Load the plugin found using `resolvePlugin`.
 *
 * @param {string} name
 *   The name to import.
 * @param {Readonly<LoadOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Promise<unknown>}
 *   Module or export.
 */
export async function loadPlugin(name, options) {
  const settings = options || defaultLoadOptions
  const fp = await resolvePlugin(name, settings)
  const mod = /** @type {Record<string, unknown>} */ (
    await import(pathToFileURL(fp).href)
  )
  return typeof settings.key === 'string'
    ? mod[settings.key]
    : settings.key === false
    ? mod
    : mod.default
}

/**
 * Find a plugin.
 *
 * See also:
 * * <https://docs.npmjs.com/files/folders#node-modules>
 * * <https://github.com/sindresorhus/resolve-from>
 *
 * Uses the standard node module loading strategy to find `$name` in each given
 * `cwd` (and optionally the global `node_modules` directory).
 *
 * If a prefix is given and `$name` is not a path, `$prefix-$name` is also
 * searched (preferring these over non-prefixed modules).
 *
 * @param {string} name
 *   The name to import.
 * @param {Readonly<ResolveOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Promise<string>}
 *   Promise that resolves to a file path.
 */
export async function resolvePlugin(name, options) {
  const settings = options || defaultResolveOptions
  const prefix = settings.prefix
    ? settings.prefix + (settings.prefix.at(-1) === '-' ? '' : '-')
    : undefined
  const cwd = settings.cwd || process.cwd()
  const sources = /** @type {Array<string>} */ (
    // type-coverage:ignore-next-line -- TS fails on readonly arrays.
    Array.isArray(cwd) ? [...cwd] : [cwd]
  )
  const globals =
    typeof settings.global === 'boolean' ? settings.global : defaultGlobal
  /** @type {string | undefined} */
  let plugin
  /** @type {Error | undefined} */
  let lastError

  // Bare specifier.
  if (name.charAt(0) !== '.') {
    if (globals) {
      sources.push(globalDir)
    }

    let scope = ''

    // Unprefix module.
    if (prefix) {
      // Scope?
      if (name.charAt(0) === '@') {
        const slash = name.indexOf('/')

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

  let index = -1

  while (++index < sources.length) {
    if (plugin) {
      const fp = attempt(sources[index], plugin)
      if (fp) return fp
    }

    const fp = attempt(sources[index], name)
    if (fp) return fp
  }

  throw lastError

  /**
   * @param {string} base
   *   Path to folder.
   * @param {string} name
   *   Name.
   * @returns {string | undefined}
   *   File path.
   */
  function attempt(base, name) {
    try {
      // `import-meta-resolve` resolves from files, whereas `load-plugin` works
      // on folders, which is why we add a `/` at the end.
      // To do: return file URL.
      return fileURLToPath(
        importMetaResolve(name, pathToFileURL(base).href + '/')
      )
    } catch (error) {
      lastError = /** @type {Error} */ (error)
    }
  }
}
