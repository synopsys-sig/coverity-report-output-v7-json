import {IssueOccurrence} from './json-v7-schema'

export const UNKNOWN_FILE = 'Unknown File'
export const COMMENT_PREFIX = '<!-- coverity-report-output-v7 -->'

export function createMessageFromDefect(issue: IssueOccurrence): string {
  let comment = `${COMMENT_PREFIX}
<!-- ${issue.mergeKey}  -->
Coverity found issue: ${issue.checkerProperties?.subcategoryShortDescription ? `${issue.checkerProperties.subcategoryShortDescription} (${issue.checkerName})` : issue.checkerName} - ${issue.checkerProperties?.impact}, ${issue.checkerProperties?.cweCategory}

<b>${issue.events.filter(event => event.main === true)[0]?.eventDescription}</b>

How to fix:
${issue.events.filter(event => event.remediation === true)[0]?.eventDescription}
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
