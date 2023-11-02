import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
// Get the real one, not the fake one from our `test/node_modules/`.
import remarkLint from '../node_modules/remark-lint/index.js'
import {loadPlugin, resolvePlugin} from '../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('core', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'loadPlugin',
      'resolvePlugin'
    ])
  })
})

test('loadPlugin', async function (t) {
  await t.test('should fail w/o argument', async function () {
    try {
      // @ts-expect-error: check how the runtime handles a missing specifier.
      await loadPlugin()
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot read properties of undefined/)
    }
  })

  await t.test(
    'should look for `$cwd/node_modules/$prefix-$name`',
    async function () {
      assert.equal(
        await loadPlugin('delta', {cwd: __dirname, prefix: 'charlie'}),
        'echo'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('delta/another.js', {
          cwd: __dirname,
          prefix: 'charlie'
        }),
        'another'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('delta/another.js', {
          cwd: __dirname,
          prefix: 'charlie'
        }),
        'another'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$scope/$prefix-$name` if a scope is given',
    async function () {
      assert.equal(
        await loadPlugin('@foxtrot/hotel', {cwd: __dirname, prefix: 'golf'}),
        'india'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$scope/$prefix-$name$rest` if a scope is given and $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('@foxtrot/hotel/other.js', {
          cwd: __dirname,
          prefix: 'golf'
        }),
        'other'
      )
    }
  )

  await t.test(
    'should look for `$root/node_modules/$prefix-$name`',
    async function () {
      assert.equal(await loadPlugin('lint', {prefix: 'remark'}), remarkLint)
    }
  )

  await t.test(
    'should look for `$root/node_modules/$prefix-$name$rest` where $rest is a path',
    async function () {
      assert.deepEqual(
        await loadPlugin('lint/index.js', {prefix: 'remark'}),
        remarkLint
      )
    }
  )

  await t.test('should throw if a path cannot be found', async function () {
    try {
      await loadPlugin('lint/index', {prefix: 'remark'})
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot find package 'lint'/)
    }
  })

  await t.test(
    'should not duplicate `$root/node_modules/$prefix-$prefix-$name`',
    async function () {
      assert.equal(
        await loadPlugin('remark-lint', {prefix: 'remark'}),
        remarkLint
      )
    }
  )

  await t.test(
    'should not duplicate `$cwd/node_modules/$scope/$prefix-$prefix-$name` if a scope is given',
    async function () {
      assert.equal(
        await loadPlugin('@foxtrot/golf-hotel', {
          cwd: __dirname,
          prefix: 'golf'
        }),
        'india'
      )
    }
  )

  await t.test('should support a dash in `$prefix`', async function () {
    assert.equal(await loadPlugin('lint', {prefix: 'remark-'}), remarkLint)
  })

  // Global: `$modules/$plugin` is untestable.

  await t.test('should look for `./index.js`', async function () {
    assert.equal(
      await loadPlugin('./index.js', {key: 'loadPlugin'}),
      loadPlugin
    )
  })

  await t.test(
    'should throw if passing a path w/o extension',
    async function () {
      try {
        await loadPlugin('./index', {key: 'loadPlugin'})
        assert.fail()
      } catch (error) {
        assert.match(String(error), /Cannot find module/)
      }
    }
  )

  await t.test(
    'should throw if passing a path to a directory',
    async function () {
      try {
        await loadPlugin('./', {key: 'loadPlugin'})
        assert.fail()
      } catch (error) {
        assert.match(String(error), /Directory import/)
      }
    }
  )

  await t.test('should support `key: false`', async function () {
    const main = /** @type {object} */ (
      await loadPlugin('./index.js', {key: false})
    )

    assert.deepEqual(Object.keys(main), ['loadPlugin', 'resolvePlugin'])
  })

  await t.test('should look for `$root/node_modules/$name`', async function () {
    assert.equal(
      typeof (await loadPlugin('micromark', {key: 'micromark'})),
      'function'
    )
  })

  await t.test(
    'should look for `$root/node_modules/$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        typeof (await loadPlugin('micromark/stream', {key: 'stream'})),
        'function'
      )
    }
  )

  await t.test('should look for `$cwd/node_modules/$name`', async function () {
    assert.equal(await loadPlugin('alpha', {cwd: __dirname}), 'bravo')
  })

  await t.test(
    'should look for `$cwd/node_modules/$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('alpha/other.js', {cwd: __dirname}),
        'other'
      )
    }
  )

  await t.test(
    'should throw for `$cwd/node_modules/$name$rest` where $rest is a path without extension',
    async function () {
      try {
        await loadPlugin('alpha/other', {cwd: __dirname})
        assert.fail()
      } catch (error) {
        assert.match(String(error), /Cannot find module/)
      }
    }
  )

  await t.test('should support a list of `cwd`s (1)', async function () {
    assert.equal(
      await loadPlugin('lint', {
        cwd: [__dirname, process.cwd()],
        prefix: 'remark'
      }),
      'echo'
    )
  })

  await t.test('should support a list of `cwd`s (2)', async function () {
    assert.equal(
      await loadPlugin('lint', {
        cwd: [process.cwd(), __dirname],
        prefix: 'remark'
      }),
      remarkLint
    )
  })

  // Global: `$modules/$plugin` is untestable

  await t.test('should throw if a path cannot be found', async function () {
    try {
      await loadPlugin('does not exist', {global: true, prefix: 'this'})
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot find package 'does not exist'/)
    }
  })

  await t.test('should throw for just a scope', async function () {
    try {
      await loadPlugin('@foxtrot', {cwd: __dirname, prefix: 'foo'})
      assert.fail()
    } catch (error) {
      assert.match(
        String(error),
        /Invalid module "@foxtrot" is not a valid package name/
      )
    }
  })

  await t.test(
    'should support loading global packages (npm)',
    async function () {
      try {
        await loadPlugin('npm', {global: true})
      } catch (error) {
        assert.match(String(error), /The programmatic API was removed/)
      }
    }
  )
})

test('resolvePlugin', async function (t) {
  await t.test('should look for `$cwd/node_modules/$name`', async function () {
    assert.equal(
      path.relative(__dirname, await resolvePlugin('alpha', {cwd: __dirname})),
      path.join('node_modules', 'alpha', 'index.js')
    )
  })

  await t.test('should throw for just a scope', async function () {
    try {
      await resolvePlugin('does not exist')
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot find package/)
    }
  })
})
