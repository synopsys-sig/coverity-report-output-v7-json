import {IssueOccurrence} from './json-v7-schema'

export const UNKNOWN_FILE = 'Unknown File'
export const COMMENT_PREFIX = '<!-- coverity-report-output-v7 -->'

export function createMessageFromIssue(issue: IssueOccurrence): string {
  const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName
  const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : ''
  const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown'
  const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : ''
  const mainEvent = issue.events.find(event => event.main === true)
  const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
  const remediationEvent = issue.events.find(event => event.remediation === true)
  const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : ''

  let comment = `${COMMENT_PREFIX}
<!-- ${issue.mergeKey} -->
# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_${checkerNameString}

${remediationString}
`

  return comment
}

export function getReportableLinesFromDiff(rawDiff: string): Map<string, Hunk[]> {
  console.info('Gathering diffs...')
  const reportableLineMap: Map<string, Hunk[]> = new Map()

  let path = UNKNOWN_FILE
  for (const line of rawDiff.split('\n')) {
    if (line.startsWith('diff --git')) {
      // TODO: Handle spaces in path
      path = `${process.env.GITHUB_WORKSPACE}/${line.split(' ')[2].substring(2)}`
      if (path === undefined) {
        path = UNKNOWN_FILE
      }

      reportableLineMap.set(path, [])
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

        if (!reportableLineMap.has(path)) {
          reportableLineMap.set(path, [])
        }
        console.info(`Added ${path}: ${startLine} to ${endLine}`)
        reportableLineMap.get(path)?.push({firstLine: startLine, lastLine: endLine})
      }
    }
  }

  return reportableLineMap
}

export interface Hunk {
  firstLine: number
  lastLine: number
}
