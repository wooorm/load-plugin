import {fileURLToPath} from 'node:url'
import path from 'node:path'
import process from 'node:process'
import assert from 'node:assert/strict'
import test from 'node:test'
import lint from '../node_modules/remark-lint/index.js'
import {resolvePlugin, loadPlugin} from '../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('loadPlugin(name[, options])', async () => {
  try {
    // @ts-expect-error runtime.
    await loadPlugin()
    assert.fail()
  } catch {}

  assert.equal(
    await loadPlugin('delta', {cwd: __dirname, prefix: 'charlie'}),
    'echo',
    'should look for `$cwd/node_modules/$prefix-$name`'
  )

  assert.equal(
    await loadPlugin('delta/another.js', {cwd: __dirname, prefix: 'charlie'}),
    'another',
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  assert.equal(
    await loadPlugin('delta/another.js', {cwd: __dirname, prefix: 'charlie'}),
    'another',
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  assert.equal(
    await loadPlugin('@foxtrot/hotel', {cwd: __dirname, prefix: 'golf'}),
    'india',
    'should look for `$cwd/node_modules/$scope/$prefix-$name` if a scope is given'
  )

  assert.equal(
    await loadPlugin('@foxtrot/hotel/other.js', {
      cwd: __dirname,
      prefix: 'golf'
    }),
    'other',
    'should look for `$cwd/node_modules/$scope/$prefix-$name$rest` if a scope is given and $rest is a path'
  )

  assert.equal(
    await loadPlugin('lint', {prefix: 'remark'}),
    lint,
    'should look for `$root/node_modules/$prefix-$name`'
  )

  assert.deepEqual(
    await loadPlugin('lint/index.js', {prefix: 'remark'}),
    lint,
    'should look for `$root/node_modules/$prefix-$name$rest` where $rest is a path'
  )

  try {
    await loadPlugin('lint/index', {prefix: 'remark'})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Cannot find package 'lint'/,
      'throws if a path cannot be found'
    )
  }

  assert.equal(
    await loadPlugin('remark-lint', {prefix: 'remark'}),
    lint,
    'should not duplicate `$root/node_modules/$prefix-$prefix-$name`'
  )

  assert.equal(
    await loadPlugin('@foxtrot/golf-hotel', {cwd: __dirname, prefix: 'golf'}),
    'india',
    'should not duplicate `$cwd/node_modules/$scope/$prefix-$prefix-$name` if a scope is given'
  )

  assert.equal(
    await loadPlugin('lint', {prefix: 'remark-'}),
    lint,
    'should support a dash in `$prefix`'
  )

  // Global: `$modules/$plugin` is untestable.

  assert.equal(
    await loadPlugin('./index.js', {key: 'loadPlugin'}),
    loadPlugin,
    'should look for `./index.js`'
  )

  try {
    await loadPlugin('./index', {key: 'loadPlugin'})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Cannot find module/,
      'throws if passing a path w/o extension'
    )
  }

  try {
    await loadPlugin('./', {key: 'loadPlugin'})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Directory import/,
      'throws if passing a path to a directory'
    )
  }

  const main = /** @type {object} */ (
    await loadPlugin('./index.js', {key: false})
  )

  assert.deepEqual(
    Object.keys(main),
    ['loadPlugin', 'resolvePlugin'],
    'should support `key: false`'
  )

  assert.equal(
    typeof (await loadPlugin('micromark', {key: 'micromark'})),
    'function',
    'should look for `$root/node_modules/$name`'
  )

  assert.equal(
    typeof (await loadPlugin('micromark/stream', {key: 'stream'})),
    'function',
    'should look for `$root/node_modules/$name$rest` where $rest is a path'
  )

  assert.equal(
    await loadPlugin('alpha', {cwd: __dirname}),
    'bravo',
    'should look for `$cwd/node_modules/$name`'
  )

  assert.equal(
    await loadPlugin('alpha/other.js', {cwd: __dirname}),
    'other',
    'should look for `$cwd/node_modules/$name$rest` where $rest is a path'
  )

  try {
    await loadPlugin('alpha/other', {cwd: __dirname})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Cannot find module/,
      'throws for `$cwd/node_modules/$name$rest` where $rest is a path without extension'
    )
  }

  assert.equal(
    await loadPlugin('lint', {
      prefix: 'remark',
      cwd: [__dirname, process.cwd()]
    }),
    'echo',
    'should support a list of `cwd`s (1)'
  )

  assert.equal(
    await loadPlugin('lint', {
      prefix: 'remark',
      cwd: [process.cwd(), __dirname]
    }),
    lint,
    'should support a list of `cwd`s (2)'
  )

  // Global: `$modules/$plugin` is untestable

  try {
    await loadPlugin('does not exist', {global: true, prefix: 'this'})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Cannot find package 'does not exist'/,
      'throws if a path cannot be found'
    )
  }

  try {
    await loadPlugin('@foxtrot', {cwd: __dirname, prefix: 'foo'})
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Invalid module "@foxtrot" is not a valid package name/,
      'throws for just a scope'
    )
  }

  try {
    await loadPlugin('npm', {global: true})
  } catch (error) {
    assert.match(
      String(error),
      /The programmatic API was removed/,
      'supports loading global packages (npm)'
    )
  }
})

test('resolvePlugin(name[, options])', async () => {
  assert.equal(
    path.relative(__dirname, await resolvePlugin('alpha', {cwd: __dirname})),
    path.join('node_modules', 'alpha', 'index.js'),
    'should look for `$cwd/node_modules/$name`'
  )

  try {
    await resolvePlugin('does not exist')
    assert.fail()
  } catch (error) {
    assert.match(
      String(error),
      /Cannot find package/,
      'throws for just a scope'
    )
  }
})
