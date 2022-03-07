import {TextEncoder} from 'util'

export class CoverityApiService {
  coverityUrl: string
  coverityAuth: string

  constructor(coverityUrl: string, coverityUsername: string, coverityPassword: string) {
    this.coverityUrl = cleanUrl(coverityUrl)
    this.coverityAuth = encodeAuth(coverityUsername, coverityPassword)
  }
}

export function cleanUrl(url: string): string {
  if (url && url.endsWith('/')) {
    return url.substr(0, url.length - 1)
  }
  return url
}

export function encodeAuth(username: string, password: string): string {
  return Buffer.from(`${username}:${password}`).toString('base64')
}
