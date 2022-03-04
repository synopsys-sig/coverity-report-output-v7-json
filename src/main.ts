import fs from 'fs'
import {createIssueComment, createReview, getExistingIssueComments, getExistingReviewComments, getPullRequestDiff, updateExistingIssueComment, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {COMMENT_PREFACE, createMessageFromIssue, createMessageFromIssueWithLineInformation, DiffMap, getDiffMap, mergeKeyCommentOf} from './reporting'
import {isPullRequest, relativizePath} from './github/github-context'
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
    const existingIssueComments = await getExistingIssueComments()
    const diffMap = await getPullRequestDiff().then(getDiffMap)

    for (const issue of coverityIssues.issues) {
      info(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`)
      const mergeKeyComment = mergeKeyCommentOf(issue)
      const reviewCommentBody = createMessageFromIssue(issue)
      const issueCommentBody = createMessageFromIssueWithLineInformation(issue)

      const existingMatchingReviewComment = existingReviewComments
        .filter(comment => comment.line === issue.mainEventLineNumber)
        .filter(comment => comment.body.includes(COMMENT_PREFACE))
        .find(comment => comment.body.includes(mergeKeyComment))

      const existingMatchingIssueComment = existingIssueComments.filter(comment => comment.body?.includes(COMMENT_PREFACE)).find(comment => comment.body?.includes(mergeKeyComment))

      if (existingMatchingReviewComment !== undefined) {
        info(`Issue already reported in comment ${existingMatchingReviewComment.id}, updating...`)
        updateExistingReviewComment(existingMatchingReviewComment.id, reviewCommentBody)
      } else if (existingMatchingIssueComment !== undefined) {
        info(`Issue already reported in comment ${existingMatchingIssueComment.id}, updating...`)
        updateExistingIssueComment(existingMatchingIssueComment.id, issueCommentBody)
      } else if (isInDiff(issue, diffMap)) {
        info('Issue not reported, adding a comment to the review.')
        newReviewComments.push(createReviewComment(issue, reviewCommentBody))
      } else {
        info('Issue not reported, adding an issue comment.')
        createIssueComment(issueCommentBody)
      }
    }

    if (newReviewComments.length > 0) {
      info('Publishing review...')
      createReview(newReviewComments)
    }
  }

  info(`Found ${coverityIssues.issues.length} Coverity issues.`)
}

function isInDiff(issue: IssueOccurrence, diffMap: DiffMap): boolean {
  const diffHunks = diffMap.get(issue.mainEventFilePathname)

  if (!diffHunks) {
    return false
  }

  return diffHunks.filter(hunk => hunk.firstLine <= issue.mainEventLineNumber).some(hunk => issue.mainEventLineNumber <= hunk.lastLine)
}

function createReviewComment(issue: IssueOccurrence, commentBody: string): NewReviewComment {
  return {
    path: relativizePath(issue.mainEventFilePathname),
    body: commentBody,
    line: issue.mainEventLineNumber,
    side: 'RIGHT'
  }
}

run()
