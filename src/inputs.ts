import {getInput} from '@actions/core'

export const GITHUB_TOKEN = getInput('github-token')
export const JSON_FILE_PATH = getInput('json-file-path')
