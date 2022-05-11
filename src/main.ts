import fs from 'fs'
import {createIssueComment, createReview, getExistingIssueComments, getExistingReviewComments, getPullRequestDiff, updateExistingIssueComment, updateExistingReviewComment} from './github/pull-request'
import {CoverityIssuesView, IssueOccurrence} from './json-v7-schema'
import {COMMENT_PREFACE, createReviewCommentMessage, createIssueCommentMessage, DiffMap, getDiffMap, createNoLongerPresentMessage, isPresent} from './reporting'
import {isPullRequest, relativizePath} from './github/github-context'
import {COVERITY_PASSWORD, COVERITY_PROJECT_NAME, COVERITY_URL, COVERITY_USERNAME, JSON_FILE_PATH} from './inputs'
import {info, setFailed, warning} from '@actions/core'
import {NewReviewComment} from './_namespaces/github'
import {mapMatchingMergeKeys, ProjectIssue} from './issue-mapper'

async function run(): Promise<void> {
  if (!isPullRequest()) {
    info('Not a Pull Request. Nothing to do...')
    return Promise.resolve()
  }

  info(`Using JSON file path: ${JSON_FILE_PATH}`)

  var jsonV7Content : any
  var coverityIssues : any
  // TODO validate file exists and is .json?
  try {
    info('Inside TRY Block of file exists or not')
    if (fs.existsSync(JSON_FILE_PATH)) {
      info('Inside TRY Block of FILE EXISTS')
       jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
      if(Object.keys(jsonV7Content).length !== 0){
        info('Inside TRY Block of FILE LENGTH IS >0')
         coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView
      }
      //file exists
    }
  } catch(err) {
    console.error(" JSON File Dosen't Exists ! Please check the file name and then try again")
  }

  // const jsonV7Content = fs.readFileSync(JSON_FILE_PATH)
  // const coverityIssues = JSON.parse(jsonV7Content.toString()) as CoverityIssuesView

  let mergeKeyToIssue = new Map<string, ProjectIssue>()

  const canCheckCoverity = COVERITY_URL && COVERITY_USERNAME && COVERITY_PASSWORD && COVERITY_PROJECT_NAME
  if (!canCheckCoverity) {
    warning('Missing Coverity Connect info. Issues will not be checked against the server.')
  } else {
    const allMergeKeys = coverityIssues.issues.map((issue: { mergeKey: any }) => issue.mergeKey)
    const allUniqueMergeKeys = new Set<string>(allMergeKeys)

    if (canCheckCoverity && coverityIssues && coverityIssues.issues.length > 0) {
      try {
        mergeKeyToIssue = await mapMatchingMergeKeys(allUniqueMergeKeys)
      } catch (error: any) {
        setFailed(error as string | Error)
        return Promise.reject()
      }
    }
  }

  const newReviewComments = []
  const actionReviewComments = await getExistingReviewComments().then(comments => comments.filter(comment => comment.body.includes(COMMENT_PREFACE)))
  const actionIssueComments = await getExistingIssueComments().then(comments => comments.filter(comment => comment.body?.includes(COMMENT_PREFACE)))
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
    } else if (ignoredOnServer) {
      info('Issue ignored on server, no comment needed.')
    } else if (!newOnServer) {
      info('Issue already existed on server, no comment needed.')
    } else if (isInDiff(issue, diffMap)) {
      info('Issue not reported, adding a comment to the review.')
      newReviewComments.push(createReviewComment(issue, reviewCommentBody))
    } else {
      info('Issue not reported, adding an issue comment.')
      createIssueComment(issueCommentBody)
    }
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
