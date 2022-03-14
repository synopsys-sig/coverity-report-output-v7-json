import {readFileSync} from 'fs'
import {DiffMap} from '../../src/reporting'

describe('Parse Diff', () => {
  test('isPullRequest() returns true', () => {
    const reporting = require('../../src/reporting')

    const expectedMap: DiffMap = new Map()
    expectedMap.set('undefined/.github/workflows/gradle.yml', [{firstLine: 1, lastLine: 22}])
    expectedMap.set('undefined/bad_cert_demo.js', [{firstLine: 1, lastLine: 24}])
    expectedMap.set('undefined/deploy.yml', [{firstLine: 1, lastLine: 38}])

    const diffMap: DiffMap = reporting.getDiffMap(readFileSync('tests/resources/test.diff', 'utf8'))

    expect(diffMap).toEqual(expectedMap)
  })
})
