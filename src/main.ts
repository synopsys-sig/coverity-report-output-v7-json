import * as core from '@actions/core'
import * as inputs from './inputs'
import fs from 'fs'
import {CoverityIssuesView} from './json-v7-schema'

async function run(): Promise<void> {
  core.info(`Using JSON file path: ${inputs.JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(inputs.JSON_FILE_PATH)
  const coverityIssues = JSON.parse(
    jsonV7Content.toString()
  ) as CoverityIssuesView

  core.info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

run()
