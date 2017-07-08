'use strict';

var path = require('path');
var test = require('tape');
var lint = require('../node_modules/remark-lint');
var loadPlugin = require('..');

test('loadPlugin(name[, options])', function (t) {
  t.throws(
    function () {
      loadPlugin();
    },
    'should throw when not given `name`'
  );

  t.equals(
    loadPlugin('delta', {
      cwd: __dirname,
      prefix: 'charlie'
    }),
    'echo',
    'should look for `$cwd/node_modules/$prefix-$name`'
  );

  t.equals(
    loadPlugin('lint', {prefix: 'remark'}),
    lint,
    'should look for `$root/node_modules/$prefix-$name`'
  );

  t.equals(
    loadPlugin('remark-lint', {prefix: 'remark'}),
    lint,
    'should not duplicate `$root/node_modules/$prefix-$prefix-$name`'
  );

  t.equals(
    loadPlugin('lint', {prefix: 'remark-'}),
    lint,
    'should support a dash in `$prefix`'
  );

  // Global: `$modules/$plugin` is untestable.

  t.equals(
    loadPlugin('./index.js'),
    loadPlugin,
    'should look for `./index.js`'
  );

  t.equals(
    loadPlugin('./index'),
    loadPlugin,
    'should look for `./index`'
  );

  t.equals(
    loadPlugin('./'),
    loadPlugin,
    'should look for `./`'
  );

  t.equals(
    loadPlugin('tape'),
    test,
    'should look for `$root/node_modules/$name`'
  );

  t.equals(
    loadPlugin('alpha', {cwd: __dirname}),
    'bravo',
    'should look for `$cwd/node_modules/$name`'
  );

  t.equals(
    loadPlugin('lint', {
      prefix: 'remark',
      cwd: [__dirname, process.cwd()]
    }),
    'echo',
    'should support a list of `cwd`s (1)'
  );

  t.equals(
    loadPlugin('lint', {
      prefix: 'remark',
      cwd: [process.cwd(), __dirname]
    }),
    lint,
    'should support a list of `cwd`s (2)'
  );

  // Global: `$modules/$plugin` is untestable

  // Also tests `global: true`.
  t.throws(
    function () {
      loadPlugin('does not exist', {
        global: true,
        prefix: 'this'
      });
    },
    /Error: Cannot find module 'does not exist'/,
    'throws if a path cannot be found'
  );

  t.end();
});

test('loadPlugin.resolve(name[, options])', function (t) {
  t.equals(
    path.relative(__dirname, loadPlugin.resolve('alpha', {
      cwd: __dirname
    })),
    path.join('node_modules', 'alpha', 'index.js'),
    'should look for `$cwd/node_modules/$name`'
  );

  t.equals(
    loadPlugin.resolve('does not exist'),
    null,
    'returns `null` if a path cannot be found'
  );

  t.end();
});
