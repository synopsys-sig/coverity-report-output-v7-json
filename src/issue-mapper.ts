import {IIssuesSearchResponse, KEY_ACTION, KEY_CID, KEY_CLASSIFICATION, KEY_FIRST_SNAPSHOT_ID, KEY_LAST_SNAPSHOT_ID, KEY_MERGE_KEY} from './coverity-api'

export class ProjectIssue {
  cid: string
  mergeKey: string
  action: string
  classification: string
  firstSnapshotId: string
  lastSnapshotId: string

  constructor(cid: string, mergeKey: string, action: string, classification: string, firstSnapshotId: string, lastSnapshotId: string) {
    this.cid = cid
    this.mergeKey = mergeKey
    this.action = action
    this.classification = classification
    this.firstSnapshotId = firstSnapshotId
    this.lastSnapshotId = lastSnapshotId
  }
}

export function mapMergeKeys(projectIssues: IIssuesSearchResponse | null): Map<string, ProjectIssue> {
  const mergeKeyToProjectIssue = new Map<string, ProjectIssue>()
  if (projectIssues == null) {
    return mergeKeyToProjectIssue
  }

  for (const issue of projectIssues.rows) {
    let cid = ''
    let mergeKey = null
    let action = ''
    let classification = ''
    let firstSnapshotId = ''
    let lastSnapshotId = ''
    for (const issueCol of issue) {
      if (issueCol.key == KEY_CID) {
        cid = issueCol.value
      } else if (issueCol.key == KEY_MERGE_KEY) {
        mergeKey = issueCol.value
      } else if (issueCol.key == KEY_ACTION) {
        action = issueCol.value
      } else if (issueCol.key == KEY_CLASSIFICATION) {
        classification = issueCol.value
      } else if (issueCol.key == KEY_FIRST_SNAPSHOT_ID) {
        firstSnapshotId = issueCol.value
      } else if (issueCol.key == KEY_LAST_SNAPSHOT_ID) {
        lastSnapshotId = issueCol.value
      }
    }
    if (mergeKey != null) {
      const newIssue = new ProjectIssue(cid, mergeKey, action, classification, firstSnapshotId, lastSnapshotId)
      mergeKeyToProjectIssue.set(mergeKey, newIssue)
    }
  }
  return mergeKeyToProjectIssue
}
