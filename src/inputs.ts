import {getInput} from '@actions/core'

export const GITHUB_TOKEN = getInput('github-token')
export const JSON_FILE_PATH = getInput('json-file-path')
export const COVERITY_URL = getInput('coverity-url')
export const COVERITY_USERNAME = getInput('coverity-username')
export const COVERITY_PASSWORD = getInput('coverity-password')
