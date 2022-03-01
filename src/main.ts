import fs from 'fs'
import {createPullRequestReview, createReviewComments, getPullRequestDiff} from './github/pull-request'
import {CoverityIssuesView} from './json-v7-schema'
import {isPullRequest} from './github/github-context'
import {getReportableLinesFromDiff} from './reporting'
import {JSON_FILE_PATH} from './inputs'
import {info} from '@actions/core'

async function run(): Promise<void> {
  info(`Using JSON file path: ${JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
  const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  if (isPullRequest()) {
    const issuesToComment = []

    const reportableLineMap = await getPullRequestDiff().then(getReportableLinesFromDiff)
    for (const issue of coverityIssues.issues) {
      console.info(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`)
      const reportableHunks = reportableLineMap.get(issue.mainEventFilePathname)
      if (reportableHunks !== undefined) {
        console.info('File is in the diff!')
        for (const hunk of reportableHunks) {
          console.info(`Checking if issue takes place between lines ${hunk.firstLine} - ${hunk.lastLine}`)
          if (hunk.firstLine <= issue.mainEventLineNumber && issue.mainEventLineNumber <= hunk.lastLine) {
            console.info('It does! Adding to review.')
            issuesToComment.push(issue)
          }
        }
      } else {
        // Create separate comment
      }
    }

    createPullRequestReview(createReviewComments(issuesToComment))
  }

  info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

run()
