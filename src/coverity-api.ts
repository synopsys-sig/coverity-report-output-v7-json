import {debug, info} from '@actions/core'
import {IRequestQueryParams} from 'typed-rest-client/Interfaces'
import {BasicCredentialHandler, BearerCredentialHandler} from 'typed-rest-client/Handlers'
import {RestClient} from 'typed-rest-client/RestClient'
import {APPLICATION_NAME} from './application-constants'

export const KEY_CID = 'cid'
export const KEY_MERGE_KEY = 'mergeKey'
export const KEY_ACTION = 'action'
export const KEY_CLASSIFICATION = 'classification'
export const KEY_FIRST_SNAPSHOT_ID = 'firstSnapshotId'
export const KEY_LAST_SNAPSHOT_ID = 'lastDetectedId'

export interface IIssuesSearchResponse {
  offset: number
  totalRows: number
  columns: string[]
  rows: IResponseCell[][]
}

export interface IResponseCell {
  key: string
  value: string
}

interface IIssueOccurrenceRequest {
  filters: IRequestFilter[]
  snapshotScope?: ISnapshotScopeFilter
  columns: string[]
}

interface IRequestFilter {
  columnKey: string
  matchMode: string
  matchers: IRequestFilterMatcher[]
}

interface IRequestFilterMatcher {
  type: string
  id?: string
  class?: string
  key?: string
  name?: string
  date?: string
}

interface ISnapshotScopeFilter {
  show?: ISnapshotScope
  compareTo?: ISnapshotScope
}

interface ISnapshotScope {
  scope: string
  includeOutdatedSnapshots: boolean
}

export class CoverityApiService {
  coverityUrl: string
  restClient: RestClient

  constructor(coverityUrl: string, coverityUsername: string, coverityPassword: string) {
    this.coverityUrl = cleanUrl(coverityUrl)

    const authHandler = new BasicCredentialHandler(coverityUsername, coverityPassword, true)
    this.restClient = new RestClient(APPLICATION_NAME, this.coverityUrl, [authHandler], {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }

  async findIssues(projectName: string, offset: number, limit: number): Promise<IIssuesSearchResponse> {
    const requestBody: IIssueOccurrenceRequest = {
      filters: [
        {
          columnKey: 'project',
          matchMode: 'oneOrMoreMatch',
          matchers: [
            {
              class: 'Project',
              name: projectName,
              type: 'nameMatcher'
            }
          ]
        }
      ],
      columns: [KEY_CID, KEY_MERGE_KEY, KEY_ACTION, KEY_CLASSIFICATION, KEY_FIRST_SNAPSHOT_ID, KEY_LAST_SNAPSHOT_ID]
    }
    const queryParameters: IRequestQueryParams = {
      params: {
        locale: 'en_us',
        offset,
        rowCount: limit,
        includeColumnLabels: 'true',
        queryType: 'bySnapshot',
        sortOrder: 'asc'
      }
    }
    let response: any
    try {
       response = await this.restClient.create<IIssuesSearchResponse>('/api/v2/issues/search', requestBody, {queryParameters})
      if (response.statusCode < 200 || response.statusCode >= 300) {
        debug(`Coverity response error: ${response.result}`)
        return Promise.reject(`Failed to retrieve issues from Coverity for project '${projectName}': ${response.statusCode}`)
      }
    }catch(error){
      info('INSIDE CATCH BLOCK OF REST API :'+ error+ 'Promise RESULt: '+ response.result)
    }
    return Promise.resolve(response.result as IIssuesSearchResponse)
  }
}

export function cleanUrl(url: string): string {
  if (url && url.endsWith('/')) {
    return url.slice(0, url.length - 1)
  }
  return url
}
