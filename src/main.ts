import {info} from '@actions/core'
import * as inputs from './inputs'

async function run(): Promise<void> {
  inputs.JSON_FILE_PATH
  info(`Using JSON file path: ${inputs.JSON_FILE_PATH}`)
}

run()
