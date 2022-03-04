import fs from 'fs'
import {createPullRequestReview, getExistingReviewComments, getPullRequestDiff, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {isPullRequest} from './github/github-context'
import {COMMENT_PREFIX, createMessageFromIssue, getReportableLinesFromDiff} from './reporting'
import {JSON_FILE_PATH} from './inputs'
import {info} from '@actions/core'
import {NewReviewComment} from './_namespaces/github'

async function run(): Promise<void> {
  info(`Using JSON file path: ${JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
  const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  if (isPullRequest()) {
    const newReviewComments = []

    const existingReviewComments = await getExistingReviewComments()
    if (existingReviewComments.length > 0) {
      info('Found existing review comments:')
      existingReviewComments.forEach(comment => console.log(comment.id, comment.body.split('\r\n')[0], comment.body.split('\r\n')[1]))
    }
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
            const commentToUpdate = existingReviewComments
              .filter(comment => comment.line === issue.mainEventLineNumber)
              .filter(comment => comment.body.split('\r\n')[0].includes(COMMENT_PREFIX))
              .find(comment => comment.body.split('\r\n')[1].includes(`<!-- ${issue.mergeKey} -->`))

            const commentBody = createMessageFromIssue(issue)

            if (commentToUpdate) {
              updateExistingReviewComment(commentToUpdate.id, commentBody)
            } else {
              newReviewComments.push(createReviewComment(issue, commentBody))
            }
          }
        }
      } else {
        // Create separate comment
      }
    }

    if (newReviewComments.length > 0) {
      createPullRequestReview(newReviewComments)
    }
  }

  info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

export function createReviewComment(issue: IssueOccurrence, commentBody: string): NewReviewComment {
  let length = process.env.GITHUB_WORKSPACE?.length
  if (!length) {
    length = 'undefined'.length
  }

  const relativePath = issue.mainEventFilePathname.substring(length + 1)

  return {
    path: relativePath,
    body: commentBody,
    line: issue.mainEventLineNumber,
    side: 'RIGHT'
  }
}

run()
