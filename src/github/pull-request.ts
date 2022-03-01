import {context, getOctokit} from '@actions/github'
import {GITHUB_TOKEN} from '../inputs'
import {IssueOccurrence} from '../json-v7-schema'
import {ReviewComments} from '../_namespaces/github'
import {createMessageFromDefect} from '../reporting'
import {getPullRequestNumber} from './github-context'

export async function getPullRequestDiff(): Promise<string> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()

  if (!pullRequestNumber) {
    return Promise.reject(Error('Could not get Pull Request Diff: Action was not running on a Pull Request'))
  }

  const response = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    mediaType: {
      format: 'diff'
    }
  })

  return response.data as unknown as string
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
      body: createMessageFromDefect(issue),
      line: issue.mainEventLineNumber,
      side: 'RIGHT'
    })
  }
  return comments
}

export async function createPullRequestReview(comments: ReviewComments): Promise<void> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()
  if (!pullRequestNumber) {
    return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'))
  }

  octokit.rest.pulls.createReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    event: 'COMMENT',
    comments
  })
}
