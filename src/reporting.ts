import {relativizePath} from './github/github-context'
import {IssueOccurrence} from './json-v7-schema'

export const PRESENT = 'PRESENT'
export const NOT_PRESENT = 'NOT_PRESENT'
export const UNKNOWN_FILE = 'Unknown File'
export const COMMENT_PREFACE = '<!-- Comment managed by coverity-report-output-v7 action, do not modify!'

export function isPresent(existingMessage: string): boolean {
  const lines = existingMessage.split('\n')
  return lines.length > 3 && lines[2] !== NOT_PRESENT
}

export function createNoLongerPresentMessage(existingMessage: string): string {
  const existingMessageLines = existingMessage.split('\n')
  return `${existingMessageLines[0]}
${existingMessageLines[1]}
${NOT_PRESENT}
-->

Coverity issue no longer present as of: ${process.env.GITHUB_SHA}
<details>
<summary>Show issue</summary>

${existingMessageLines.slice(4).join('\n')}
</details>`
}

export function createReviewCommentMessage(issue: IssueOccurrence): string {
  const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName
  const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : ''
  const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown'
  const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : ''
  const mainEvent = issue.events.find(event => event.main === true)
  const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
  const remediationEvent = issue.events.find(event => event.remediation === true)
  const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : ''

  return `${COMMENT_PREFACE}
${issue.mergeKey}
${PRESENT}
-->

# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_${checkerNameString}

${remediationString}
`
}

export function createIssueCommentMessage(issue: IssueOccurrence): string {
  const message = createReviewCommentMessage(issue)
  const relativePath = relativizePath(issue.mainEventFilePathname)


  return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it at:
[${relativePath}:${issue.mainEventLineNumber}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA}/${relativePath}#L${issue.mainEventLineNumber})
`
}

export function getDiffMap(rawDiff: string): DiffMap {
  console.info('Gathering diffs...')
  const diffMap = new Map()

  let path = UNKNOWN_FILE
  for (const line of rawDiff.split('\n')) {
    if (line.startsWith('diff --git')) {
      // TODO: Handle spaces in path
      path = `${process.env.GITHUB_WORKSPACE}/${line.split(' ')[2].substring(2)}`
      if (path === undefined) {
        path = UNKNOWN_FILE
      }

      diffMap.set(path, [])
    }

    if (line.startsWith('@@')) {
      let changedLines = line.substring(3)
      changedLines = changedLines.substring(0, changedLines.indexOf(' @@'))

      const linesAddedPosition = changedLines.indexOf('+')
      if (linesAddedPosition > -1) {
        // We only care about the right side because Coverity can only analyze what's there, not what used to be --rotte FEB 2022
        const linesAddedString = changedLines.substring(linesAddedPosition + 1)
        const separatorPosition = linesAddedString.indexOf(',')

        const startLine = parseInt(linesAddedString.substring(0, separatorPosition))
        const lineCount = parseInt(linesAddedString.substring(separatorPosition + 1))
        const endLine = startLine + lineCount - 1

        if (!diffMap.has(path)) {
          diffMap.set(path, [])
        }
        console.info(`Added ${path}: ${startLine} to ${endLine}`)
        diffMap.get(path)?.push({firstLine: startLine, lastLine: endLine})
      }
    }
  }

  return diffMap
}

export type DiffMap = Map<string, Hunk[]>

export interface Hunk {
  firstLine: number
  lastLine: number
}
