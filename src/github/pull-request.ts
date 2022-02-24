import {context, getOctokit} from '@actions/github'
import {GITHUB_TOKEN} from '../inputs'
import {getPullRequestNumber} from './github-context'

type Side = 'RIGHT' | 'LEFT'

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

export async function createPullRequestReviewComment(body: string, lastSide: Side = 'RIGHT', lastLine: number, firstSide?: Side, firstLine?: number): Promise<void> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()

  if (!pullRequestNumber) {
    return Promise.reject(Error('Could not create Pull Request Review COmment: Action was not running on a Pull Request'))
  }

  octokit.rest.pulls.createReviewComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    body,
    start_side: firstSide,
    start_line: firstLine,
    side: lastSide,
    line: lastLine
  })
}
