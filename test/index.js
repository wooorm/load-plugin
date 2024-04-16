import assert from 'node:assert/strict'
import process from 'node:process'
import test from 'node:test'
import {loadPlugin, resolvePlugin} from 'load-plugin'
import {regex} from 'github-slugger/regex.js'
// Get the real one, not the fake one from our `test/node_modules/`.
import remarkLint from '../node_modules/remark-lint/index.js'

test('core', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('load-plugin')).sort(), [
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
        await loadPlugin('delta', {from: import.meta.url, prefix: 'charlie'}),
        'echo'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$prefix-$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('delta/another.js', {
          from: import.meta.url,
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
          from: import.meta.url,
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
        await loadPlugin('@foxtrot/hotel', {
          from: import.meta.url,
          prefix: 'golf'
        }),
        'india'
      )
    }
  )

  await t.test(
    'should look for `$cwd/node_modules/$scope/$prefix-$name$rest` if a scope is given and $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('@foxtrot/hotel/other.js', {
          from: import.meta.url,
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
        await loadPlugin('slugger/regex.js', {
          key: 'regex',
          prefix: 'github'
        }),
        regex
      )
    }
  )

  await t.test('should throw if a path cannot be found', async function () {
    try {
      await loadPlugin('lint/index', {prefix: 'remark'})
      assert.fail()
    } catch (error) {
      assert.match(String(error), /Cannot find/)
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
          from: import.meta.url,
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
    assert.equal(await loadPlugin('alpha', {from: import.meta.url}), 'bravo')
  })

  await t.test(
    'should look for `$cwd/node_modules/$name$rest` where $rest is a path',
    async function () {
      assert.equal(
        await loadPlugin('alpha/other.js', {from: import.meta.url}),
        'other'
      )
    }
  )

  await t.test(
    'should throw for `$cwd/node_modules/$name$rest` where $rest is a path without extension',
    async function () {
      try {
        await loadPlugin('alpha/other', {from: import.meta.url})
        assert.fail()
      } catch (error) {
        assert.match(String(error), /Cannot find module/)
      }
    }
  )

  await t.test('should support a list of `cwd`s (1)', async function () {
    assert.equal(
      await loadPlugin('lint', {
        from: [import.meta.url, new URL('../', import.meta.url)],
        prefix: 'remark'
      }),
      'echo'
    )
  })

  await t.test('should support a list of `cwd`s (2)', async function () {
    assert.equal(
      await loadPlugin('lint', {
        from: [process.cwd(), new URL('../', import.meta.url)],
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
      await loadPlugin('@foxtrot', {from: import.meta.url, prefix: 'foo'})
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
      // If this fails, you need to make sure to install `f-ck` globally.
      // That’s done by CI; but when running tests locally needs to be done manually.
      const vowel = await loadPlugin('f-ck', {global: true, key: 'vowel'})
      assert.equal(typeof vowel, 'function')
    }
  )
})

test('resolvePlugin', async function (t) {
  await t.test('should look for `$cwd/node_modules/$name`', async function () {
    assert.equal(
      await resolvePlugin('alpha', {from: import.meta.url}),
      new URL('node_modules/alpha/index.js', import.meta.url).href
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
