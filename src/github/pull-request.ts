import {context, getOctokit} from '@actions/github'
import {getPullRequestNumber, getSha} from './github-context'
import {GITHUB_TOKEN} from '../inputs'

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

export async function createPullRequestReviewComment(body: string, path: string, lastLine: number, lastSide: Side = 'RIGHT', firstLine?: number, firstSide?: Side): Promise<void> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()
  let length = process.env.GITHUB_WORKSPACE?.length
  if (!length) {
    length = 'undefined'.length
  }
  const relativePath = path.substring(length)

  if (!pullRequestNumber) {
    return Promise.reject(Error('Could not create Pull Request Review COmment: Action was not running on a Pull Request'))
  }

  octokit.rest.pulls.createReviewComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    body,
    path: relativePath,
    commit_id: getSha(),
    start_side: firstSide,
    start_line: firstLine,
    side: lastSide,
    line: lastLine
  })
}
