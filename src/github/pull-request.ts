import {context, getOctokit} from '@actions/github'
import {GITHUB_TOKEN} from '../inputs'
import {getPullRequestNumber, getSha} from './github-context'

export async function getPullRequestDiff(): Promise<GitDiff[]> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()

  if (!pullRequestNumber) {
    return Promise.reject('Could not get Pull Request Diff: Action was not running on a Pull Request')
  }

  const response = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    mediaType: {
      format: "diff",
    },
  })

  const gitDiff = response.data

  return Promise.reject('Not yet implemented')
}

export interface GitDiff {
  filePath: string,
  firstLine: number,
  lastLine: number
}