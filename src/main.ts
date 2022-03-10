import fs from 'fs'
import {createIssueComment, createReview, getExistingIssueComments, getExistingReviewComments, getPullRequestDiff, updateExistingIssueComment, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {COMMENT_PREFACE, createReviewCommentMessage, createIssueCommentMessage, DiffMap, getDiffMap, createNoLongerPresentMessage, isPresent} from './reporting'
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
    const actionReviewComments = await getExistingReviewComments().then(comments => comments.filter(comment => comment.body.includes(COMMENT_PREFACE)))
    const actionIssueComments = await getExistingIssueComments().then(comments => comments.filter(comment => comment.body?.includes(COMMENT_PREFACE)))
    const diffMap = await getPullRequestDiff().then(getDiffMap)

    for (const issue of coverityIssues.issues) {
      info(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`)
      const reviewCommentBody = createReviewCommentMessage(issue)
      const issueCommentBody = createIssueCommentMessage(issue)

      const reviewCommentIndex = actionReviewComments.findIndex(comment => comment.line === issue.mainEventLineNumber && comment.body.includes(issue.mergeKey))
      let existingMatchingReviewComment = undefined
      if (reviewCommentIndex !== -1) {
        existingMatchingReviewComment = actionReviewComments.splice(reviewCommentIndex, 1)[0]
      }

      const issueCommentIndex = actionIssueComments.findIndex(comment => comment.body?.includes(issue.mergeKey))
      let existingMatchingIssueComment = undefined
      if (issueCommentIndex !== -1) {
        existingMatchingIssueComment = actionIssueComments.splice(issueCommentIndex, 1)[0]
      }

      if (existingMatchingReviewComment !== undefined) {
        info(`Issue already reported in comment ${existingMatchingReviewComment.id}, updating if necessary...`)
        if (existingMatchingReviewComment.body !== reviewCommentBody) {
          updateExistingReviewComment(existingMatchingReviewComment.id, reviewCommentBody)
        }
      } else if (existingMatchingIssueComment !== undefined) {
        info(`Issue already reported in comment ${existingMatchingIssueComment.id}, updating if necessary...`)
        if (existingMatchingIssueComment.body !== issueCommentBody) {
          updateExistingIssueComment(existingMatchingIssueComment.id, issueCommentBody)
        }
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

    for (const comment of actionReviewComments) {
      if (isPresent(comment.body)) {
        info(`Comment ${comment.id} represents a Coverity issue which is no longer present, updating comment to reflect resolution.`)
        updateExistingReviewComment(comment.id, createNoLongerPresentMessage(comment.body))
      }
    }

    for (const comment of actionIssueComments) {
      if (comment.body !== undefined && isPresent(comment.body)) {
        info(`Comment ${comment.id} represents a Coverity issue which is no longer present, updating comment to reflect resolution.`)
        updateExistingReviewComment(comment.id, createNoLongerPresentMessage(comment.body))
      }
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
