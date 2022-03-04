import {ExistingReviewComment, NewReviewComment} from '../_namespaces/github'
import {context, getOctokit} from '@actions/github'
import {GITHUB_TOKEN} from '../inputs'
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

export async function getExistingReviewComments(): Promise<ExistingReviewComment[]> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()
  if (!pullRequestNumber) {
    return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'))
  }

  const reviewCommentsResponse = await octokit.rest.pulls.listReviewComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber
  })

  return reviewCommentsResponse.data
}

export async function updateExistingReviewComment(commentId: number, body: string): Promise<void> {
  const octokit = getOctokit(GITHUB_TOKEN)

  octokit.rest.pulls.updateReviewComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: commentId,
    body
  })
}

export async function createPullRequestReview(comments: NewReviewComment[]): Promise<void> {
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
