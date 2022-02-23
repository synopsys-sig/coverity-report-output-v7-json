import {context, getOctokit} from '@actions/github'
import {GITHUB_TOKEN} from '../inputs'
import {getPullRequestNumber} from './github-context'

export async function getPullRequestDiff(): Promise<GitDiff[]> {
  const octokit = getOctokit(GITHUB_TOKEN)

  const pullRequestNumber = getPullRequestNumber()

  if (!pullRequestNumber) {
    return Promise.reject(
      Error(
        'Could not get Pull Request Diff: Action was not running on a Pull Request'
      )
    )
  }

  const response = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    mediaType: {
      format: 'diff'
    }
  })

  const diffs = []

  const diff = response.data as unknown as string
  const diffLines = diff.split('\n')

  let path = undefined
  for (const line of diffLines) {
    if (line.startsWith('diff --git')) {
      // TODO: Handle spaces in path
      path = line.split(' ')[2].substring(2)
    }

    if (line.startsWith('@@')) {
      let changedLines = line.substring(3)
      changedLines = changedLines.substring(0, changedLines.indexOf(' @@'))

      const linesAddedPosition = changedLines.indexOf('+')
      if (linesAddedPosition > -1) {
        // We only care about the right side because Coverity can only analyze what's there, not what used to be --rotte FEB 2022
        const linesAddedString = changedLines.substring(linesAddedPosition + 1)
        const separatorPosition = linesAddedString.indexOf(',')

        const startLine = parseInt(
          linesAddedString.substring(0, separatorPosition)
        )
        const lineCount = parseInt(
          linesAddedString.substring(separatorPosition + 1)
        )
        const endLine = startLine + lineCount - 1

        diffs.push({
          filePath: path,
          firstLine: startLine,
          lastLine: endLine
        })
      }
    }
  }

  return diffs
}

export interface GitDiff {
  filePath?: string
  firstLine: number
  lastLine: number
}
