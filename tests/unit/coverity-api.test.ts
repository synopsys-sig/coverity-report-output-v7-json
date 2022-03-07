test('cleanUrl() trailing slash', () => {
  const covApi = require('../../src/coverity-api')

  const validUrl = 'https://my-domain.com'
  const testUrl = `${validUrl}/`
  const cleanUrl = covApi.cleanUrl(testUrl)
  expect(cleanUrl).toBe(validUrl)
})

test('cleanUrl() no trailing slash', () => {
  const covApi = require('../../src/coverity-api')

  const testUrl = 'https://my-domain.com'
  const cleanUrl = covApi.cleanUrl(testUrl)
  expect(cleanUrl).toBe(testUrl)
})
