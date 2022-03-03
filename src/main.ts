import fs from 'fs'
import {createPullRequestReview, getExistingReviewComments, getPullRequestDiff, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {isPullRequest} from './github/github-context'
import {COMMENT_PREFIX, createMessageFromIssue, getReportableLinesFromDiff} from './reporting'
import {JSON_FILE_PATH} from './inputs'
import {info} from '@actions/core'
import {ReviewComments} from './_namespaces/github'

async function run(): Promise<void> {
  info(`Using JSON file path: ${JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
  const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  if (isPullRequest()) {
    const issuesToComment = []

    const reviewCommentsPromise = getExistingReviewComments()
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
            const reviewComments = await reviewCommentsPromise

            const commentToUpdate = reviewComments
              .filter(comment => comment.line === issue.mainEventLineNumber)
              .filter(comment => comment.body.split('\r\n')[0] === COMMENT_PREFIX)
              .find(comment => comment.body.split('\r\n')[1] === `<!-- ${issue.mergeKey} -->`)

            if (commentToUpdate) {
              updateExistingReviewComment(commentToUpdate.id, createMessageFromIssue(issue))
            } else {
              issuesToComment.push(issue)
            }
          }
        }
      } else {
        // Create separate comment
      }
    }

    if (issuesToComment.length > 0) {
      const newReviewComments = createReviewComments(issuesToComment)
      createPullRequestReview(newReviewComments)
    }
  }

  info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

export function createReviewComments(issues: IssueOccurrence[]): ReviewComments {
  const comments: ReviewComments = []
  for (const issue of issues) {
    let length = process.env.GITHUB_WORKSPACE?.length
    if (!length) {
      length = 'undefined'.length
    }

    const relativePath = issue.mainEventFilePathname.substring(length + 1)

    comments.push({
      path: relativePath,
      body: createMessageFromIssue(issue),
      line: issue.mainEventLineNumber,
      side: 'RIGHT'
    })
  }
  return comments
}

run()
