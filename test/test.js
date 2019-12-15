/* global describe */
/* global context */
/* global it */
/* global after */
const io = require('..')

const { assert } = require('chai')

describe('State Center', function() {
  context('state.io', function() {
    it('io is object', function() {
      assert.isObject(io)
    })
  })

  after(function() {
    io.close()
  })
})
