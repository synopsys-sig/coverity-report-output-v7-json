import {RestEndpointMethodTypes} from '@octokit/rest'

// @octokit/rest > Endpoints.d.ts > PullsGetResponseData
export type PullRequest = RestEndpointMethodTypes['pulls']['get']['response']['data']

// @octokit/rest > Endpoints.d.ts > /repos/{owner}/{repo}/pulls/{pull_number}/reviews > comments
export type ReviewCommentsParameter = RestEndpointMethodTypes['pulls']['createReview']['parameters']['comments']
export type NewReviewComment = (ReviewCommentsParameter & Exclude<ReviewCommentsParameter, undefined>)[number]

// @octokit/rest > Endpoints.d.ts > /repos/{owner}/{repo}/pulls/{pull_number}/comments
export type ExistingReviewComment = RestEndpointMethodTypes['pulls']['listReviewComments']['response']['data'][number]
