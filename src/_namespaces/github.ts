import {RestEndpointMethodTypes} from '@octokit/rest'

// @octokit/rest > Endpoints.d.ts > PullsGetResponseData
export type PullRequest = RestEndpointMethodTypes['pulls']['get']['response']['data']

// @octokit/rest > Endpoints.d.ts > /repos/{owner}/{repo}/pulls/{pull_number}/reviews > comments
export type ReviewComments = RestEndpointMethodTypes['pulls']['createReview']['parameters']['comments']

// @octokit/rest > Endpoints.d.ts > /repos/{owner}/{repo}/pulls/{pull_number}/comments
export type ExistingReviewComment = RestEndpointMethodTypes['pulls']['listReviewComments']['response']['data'][number]
