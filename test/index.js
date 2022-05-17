import {fileURLToPath} from 'url'
import path from 'path'
import process from 'process'
import test from 'tape'
// @ts-expect-error: untyped
// eslint-disable-next-line node/file-extension-in-import
import testTest from 'tape/lib/test'
import lint from '../node_modules/remark-lint/index.js'
import {resolvePlugin, loadPlugin} from '../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('loadPlugin(name[, options])', async (t) => {
  try {
    // @ts-expect-error runtime.
    await loadPlugin()
    t.fail()
  } catch {
    t.pass('should throw when not given `name`')
  }

  t.equals(
    await loadPlugin('delta', {cwd: __dirname, prefix: 'charlie'}),
    'echo',
    'should look for `$cwd/node_modules/$prefix-$name`'
  )

  t.equals(
    await loadPlugin('delta/another.js', {cwd: __dirname, prefix: 'charlie'}),
    'another',
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  t.equals(
    await loadPlugin('delta/another.js', {cwd: __dirname, prefix: 'charlie'}),
    'another',
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  t.equals(
    await loadPlugin('@foxtrot/hotel', {cwd: __dirname, prefix: 'golf'}),
    'india',
    'should look for `$cwd/node_modules/$scope/$prefix-$name` if a scope is given'
  )

  t.equals(
    await loadPlugin('@foxtrot/hotel/other.js', {
      cwd: __dirname,
      prefix: 'golf'
    }),
    'other',
    'should look for `$cwd/node_modules/$scope/$prefix-$name$rest` if a scope is given and $rest is a path'
  )

  t.equals(
    await loadPlugin('lint', {prefix: 'remark'}),
    lint,
    'should look for `$root/node_modules/$prefix-$name`'
  )

  t.deepEquals(
    await loadPlugin('lint/index.js', {prefix: 'remark'}),
    lint,
    'should look for `$root/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  try {
    await loadPlugin('lint/index', {prefix: 'remark'})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Cannot find package 'lint'/,
      'throws if a path cannot be found'
    )
  }

  t.equals(
    await loadPlugin('remark-lint', {prefix: 'remark'}),
    lint,
    'should not duplicate `$root/node_modules/$prefix-$prefix-$name`'
  )

  t.equals(
    await loadPlugin('@foxtrot/golf-hotel', {cwd: __dirname, prefix: 'golf'}),
    'india',
    'should not duplicate `$cwd/node_modules/$scope/$prefix-$prefix-$name` if a scope is given'
  )

  t.equals(
    await loadPlugin('lint', {prefix: 'remark-'}),
    lint,
    'should support a dash in `$prefix`'
  )

  // Global: `$modules/$plugin` is untestable.

  t.equals(
    await loadPlugin('./index.js', {key: 'loadPlugin'}),
    loadPlugin,
    'should look for `./index.js`'
  )

  try {
    await loadPlugin('./index', {key: 'loadPlugin'})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Cannot find module/,
      'throws if passing a path w/o extension'
    )
  }

  try {
    await loadPlugin('./', {key: 'loadPlugin'})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Directory import/,
      'throws if passing a path to a directory'
    )
  }

  const main = /** @type {object} */ (
    await loadPlugin('./index.js', {key: false})
  )

  t.deepEquals(
    Object.keys(main),
    ['loadPlugin', 'resolvePlugin'],
    'should support `key: false`'
  )

  t.equals(
    await loadPlugin('tape'),
    test,
    'should look for `$root/node_modules/$name`'
  )

  t.deepEquals(
    await loadPlugin('tape/lib/test'),
    testTest,
    'should look for `$root/node_modules/$name$rest` where $rest is a path'
  )

  t.equals(
    await loadPlugin('alpha', {cwd: __dirname}),
    'bravo',
    'should look for `$cwd/node_modules/$name`'
  )

  t.equals(
    await loadPlugin('alpha/other.js', {cwd: __dirname}),
    'other',
    'should look for `$cwd/node_modules/$name$rest` where $rest is a path'
  )

  try {
    await loadPlugin('alpha/other', {cwd: __dirname})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Cannot find module/,
      'throws for `$cwd/node_modules/$name$rest` where $rest is a path without extension'
    )
  }

  t.equals(
    await loadPlugin('lint', {
      prefix: 'remark',
      cwd: [__dirname, process.cwd()]
    }),
    'echo',
    'should support a list of `cwd`s (1)'
  )

  t.equals(
    await loadPlugin('lint', {
      prefix: 'remark',
      cwd: [process.cwd(), __dirname]
    }),
    lint,
    'should support a list of `cwd`s (2)'
  )

  // Global: `$modules/$plugin` is untestable

  // Also tests `global: true`.
  try {
    await loadPlugin('does not exist', {global: true, prefix: 'this'})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Cannot find package 'does not exist'/,
      'throws if a path cannot be found'
    )
  }

  try {
    await loadPlugin('@foxtrot', {cwd: __dirname, prefix: 'foo'})
    t.fail()
  } catch (error) {
    t.match(
      String(error),
      /Invalid module "@foxtrot" is not a valid package name/,
      'throws for just a scope'
    )
  }

  t.end()
})

test('resolvePlugin(name[, options])', async (t) => {
  t.equals(
    path.relative(__dirname, await resolvePlugin('alpha', {cwd: __dirname})),
    path.join('node_modules', 'alpha', 'index.js'),
    'should look for `$cwd/node_modules/$name`'
  )

  try {
    await resolvePlugin('does not exist')
    t.fail()
  } catch (error) {
    t.match(String(error), /Cannot find package/, 'throws for just a scope')
  }

  t.end()
})
