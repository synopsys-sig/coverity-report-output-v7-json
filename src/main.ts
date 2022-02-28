import * as core from '@actions/core'
import * as inputs from './inputs'
import fs from 'fs'
import {CoverityIssuesView} from './json-v7-schema'
import {isPullRequest} from './github/github-context'
import {createPullRequestReviewComment, getPullRequestDiff} from './github/pull-request'
import {createMessageFromDefect, getReportableLinesFromDiff} from './reporting'
import {context} from '@actions/github'

async function run(): Promise<void> {
  core.info(`Using JSON file path: ${inputs.JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(inputs.JSON_FILE_PATH)
  const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  if (isPullRequest()) {
    const reportableLineMap = await getPullRequestDiff().then(getReportableLinesFromDiff)
    for (const issue of coverityIssues.issues) {
      console.info(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`)
      const reportableHunks = reportableLineMap.get(issue.mainEventFilePathname)
      if (reportableHunks !== undefined) {
        console.info('File is in the diff!')
        for (const hunk of reportableHunks) {
          console.info(`Checking if issue takes place between lines ${hunk.firstLine} - ${hunk.lastLine}`)
          if (hunk.firstLine <= issue.mainEventLineNumber && issue.mainEventLineNumber <= hunk.lastLine) {
            console.info('It does! Commenting on PR.')
            createPullRequestReviewComment(createMessageFromDefect(issue), issue.mainEventFilePathname, issue.mainEventLineNumber)
          }
        }
      } else {
        // Create separate comment
      }
    }
  }

  core.info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

run()
