import fs from 'fs'
import {createIssueComment, createReview, getExistingIssueComments, getExistingReviewComments, getPullRequestDiff, updateExistingIssueComment, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {COMMENT_PREFACE, createMessageFromIssue, createMessageFromIssueWithLineInformation, DiffMap, getDiffMap, mergeKeyCommentOf} from './reporting'
import {isPullRequest, relativizePath} from './github/github-context'
import {COVERITY_PASSWORD, COVERITY_PROJECT_NAME, COVERITY_URL, COVERITY_USERNAME, JSON_FILE_PATH} from './inputs'
import {info, setFailed, warning} from '@actions/core'
import {NewReviewComment} from './_namespaces/github'
import {CoverityApiService, IIssuesSearchResponse, KEY_ACTION, KEY_CID, KEY_CLASSIFICATION, KEY_FIRST_SNAPSHOT_ID, KEY_LAST_SNAPSHOT_ID, KEY_MERGE_KEY} from './coverity-api'
import {mapMergeKeys, ProjectIssue} from './issue-mapper'

async function run(): Promise<void> {
  if (!isPullRequest()) {
    info('Not a Pull Request. Nothing to do...')
    return Promise.resolve()
  }

  info(`Using JSON file path: ${JSON_FILE_PATH}`)

  // TODO validate file exists and is .json?
  const jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
  const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  const canCheckCoverity = COVERITY_URL && COVERITY_USERNAME && COVERITY_PASSWORD && COVERITY_PROJECT_NAME
  if (!canCheckCoverity) {
    warning('Missing Coverity Connect info. Issues will not be checked against the server.')
  }

  let mergeKeyToIssue = new Map<string, ProjectIssue>()
  if (canCheckCoverity && coverityIssues && coverityIssues.issues.length > 0) {
    let covProjectIssues: IIssuesSearchResponse | any = null
    const apiService = new CoverityApiService(COVERITY_URL, COVERITY_USERNAME, COVERITY_PASSWORD)
    // TODO page through issues?
    await apiService
      .findIssues(COVERITY_PROJECT_NAME, 0, 500)
      .then(result => (covProjectIssues = result))
      .catch(error => setFailed(error))
    info(`Found ${covProjectIssues?.totalRows} potentially matching issues on the server`)
    mergeKeyToIssue = mapMergeKeys(covProjectIssues)
  }

  const newReviewComments = []
  const existingReviewComments = await getExistingReviewComments()
  const existingIssueComments = await getExistingIssueComments()
  const diffMap = await getPullRequestDiff().then(getDiffMap)

  for (const issue of coverityIssues.issues) {
    info(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`)

    const projectIssue = mergeKeyToIssue.get(issue.mergeKey)
    let ignoredOnServer = false
    let newOnServer = true
    if (projectIssue) {
      ignoredOnServer = projectIssue.action == 'Ignore' || projectIssue.classification in ['False Positive', 'Intentional']
      newOnServer = projectIssue.firstSnapshotId == projectIssue.lastSnapshotId
      info(`Issue state on server: ignored=${ignoredOnServer}, new=${newOnServer}`)
    }

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
    } else if (ignoredOnServer) {
      info('Issue ignored on server, no comment needed.')
    } else if (!newOnServer) {
      info('Issue already existed on server, no comment needed.')
    } else {
      info('Issue not reported, adding an issue comment.')
      createIssueComment(issueCommentBody)
    }
  }

  if (newReviewComments.length > 0) {
    info('Publishing review...')
    createReview(newReviewComments)
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
