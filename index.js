/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module load-plugin
 * @fileoverview Load a submodule / plugin.
 */

'use strict';

/* eslint-env node */

var fs = require('fs');
var path = require('path');
var findRoot = require('find-root');
var npmPrefix = require('npm-prefix')();

/*
 * Methods.
 */

var resolve = path.resolve;

/*
 * Constants.
 */

var MODULES = 'node_modules';
var EXTENSION = '.js';
var isElectron = process.versions.electron !== undefined;
var isGlobal = isElectron || process.argv[1].indexOf(npmPrefix) === 0;
var isWindows = process.platform === 'win32';
var prefix = isWindows ? /* istanbul ignore next */ '' : 'lib';
var globals = resolve(npmPrefix, prefix, MODULES);

/**
 * Require a plugin.  Checks, in this order:
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
 * If one of these exists, it’s `require`d.
 *
 * @see https://docs.npmjs.com/files/folders#node-modules
 *
 * @example
 *   var plugin = loadPlugin('toc', {prefix: 'foo'});
 *
 * @throws {Error} - Fails when `name` cannot be
 *   resolved.
 * @param {string} name - Reference to plugin.
 * @param {Object?} [options] - Configuration,
 * @return {Object} - Result of `require`ing `plugin`.
 */
function loadPlugin(name, options) {
    var settings = options || {};
    var cwd = settings.cwd || process.cwd();
    var global = settings.global;
    var prefix = settings.prefix;
    var root = findRoot(cwd);
    var paths = [];
    var plugin;
    var index;
    var length;

    if (global === null || global === undefined) {
        global = isGlobal;
    }

    if (prefix) {
        if (prefix.charAt(prefix.length - 1) !== '-') {
            prefix += '-';
        }

        plugin = prefix + name;

        paths.push(
            resolve(root, MODULES, plugin),
            resolve(cwd, MODULES, plugin)
        );

        if (global) {
            paths.push(resolve(globals, plugin));
        }
    }

    paths.push(
        resolve(root, name),
        resolve(root, name + EXTENSION),
        resolve(root, MODULES, name),
        resolve(cwd, MODULES, name)
    );

    if (global) {
        paths.push(resolve(globals, name));
    }

    length = paths.length;
    index = -1;

    while (++index < length) {
        try {
            fs.statSync(paths[index]);
            name = paths[index];
            break;
        } catch (e) { /* Empty */ }
    }

    return require(name);
}

/*
 * Expose.
 */

module.exports = loadPlugin;
