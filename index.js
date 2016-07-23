/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module load-plugin
 * @fileoverview Load a submodule / plugin.
 */

'use strict';

/* Dependencies */
var fs = require('fs');
var path = require('path');
var findRoot = require('find-root');
var unique = require('array-unique');
var npmPrefix = require('npm-prefix')();

/* Expose. */
module.exports = exports = loadPlugin;

exports.resolve = resolvePlugin;

/* Methods. */
var resolve = path.resolve;

/* Constants. */
var MODULES = 'node_modules';
var EXTENSION = '.js';
var isElectron = process.versions.electron !== undefined;
var argv = process.argv[1] || /* istanbul ignore next */ '';
var isGlobal = isElectron || argv.indexOf(npmPrefix) === 0;
var isWindows = process.platform === 'win32';
var prefix = isWindows ? /* istanbul ignore next */ '' : 'lib';
var globals = resolve(npmPrefix, prefix, MODULES);

/**
 * Check where plugin can be found.  Checks, in this order:
 *
 * -  `$root/node_modules/$plugin` (if `prefix`);
 * -  `$cwd/node_modules/$plugin` (if `prefix`);
 * -  `$modules/$plugin` (if `prefix` and `global`).
 * -  `$root/$name`;
 * -  `$root/$name.js`;
 * -  `$root/node_modules/$name`;
 * -  `$cwd/node_modules/$name`;
 * -  `$modules/$name` (if `global`).
 *
 * Where:
 *
 * - `$cwd` — Directory to search from (configurable);
 * - `$root` — Ancestral directory of `$cwd`, with a
 *   `package.json`;
 * - `$name` — Given `name`;
 * - `$plugin` — When `prefix` is given, `prefix` and `name`
 *   joined together with a hyphen;
 * - `$modules` — Location of globally installed npm packages.
 *
 * If one of these exists, that path is returned.
 *
 * @see https://docs.npmjs.com/files/folders#node-modules
 *
 * @example
 *   var path = resolvePlugin('toc', {prefix: 'foo'});
 *
 * @param {string} name - Reference to plugin.
 * @param {Object?} [options] - Configuration,
 * @return {string?} - Path to `name`, if found.
 */
function resolvePlugin(name, options) {
  var settings = options || {};
  var cwd = settings.cwd || process.cwd();
  var global = settings.global;
  var prefix = settings.prefix;
  var paths = [];
  var root;
  var plugin;
  var index;
  var length;

  try {
    root = findRoot(cwd);
  } catch (err) { /* empty */ }

  if (global === null || global === undefined) {
    global = isGlobal;
  }

  if (prefix) {
    if (prefix.charAt(prefix.length - 1) !== '-') {
      prefix += '-';
    }

    if (name.slice(0, prefix.length) === prefix) {
      plugin = name;
      name = null;
    } else {
      plugin = prefix + name;
    }

    /* istanbul ignore else - not testable. */
    if (root) {
      paths.push(resolve(root, MODULES, plugin));
    }

    paths.push(resolve(cwd, MODULES, plugin));

    if (global) {
      paths.push(resolve(globals, plugin));
    }
  }

  if (name) {
    /* istanbul ignore else - not testable. */
    if (root) {
      paths.push(
        resolve(root, name),
        resolve(root, name + EXTENSION),
        resolve(root, MODULES, name)
      );
    }

    paths.push(resolve(cwd, MODULES, name));

    if (global) {
      paths.push(resolve(globals, name));
    }
  }

  unique(paths);

  length = paths.length;
  index = -1;

  while (++index < length) {
    try {
      fs.statSync(paths[index]);
    } catch (err) {
      continue;
    }

    return paths[index];
  }

  return null;
}

/**
 * Loads the plug-in found using `resolvePlugin`.
 *
 * @example
 *   var plugin = resolvePlugin('toc', {prefix: 'foo'});
 *
 * @throws {Error} - Fails when `name` cannot be
 *   resolved.
 * @param {string} name - Reference to plugin.
 * @param {Object?} [options] - Configuration,
 * @return {Object} - Result of `require`ing `plugin`.
 */
function loadPlugin(name, options) {
  return require(resolvePlugin(name, options) || name);
}
