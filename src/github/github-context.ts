import {PullRequest} from '../_namespaces/github'
import {context} from '@actions/github'
import {info} from "@actions/core";

const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment']

export function isPullRequest(): boolean {
  return prEvents.includes(context.eventName)
}

export function getSha(): string {
  let sha = context.sha
  if (isPullRequest()) {
    const pull = context.payload.pull_request as PullRequest
    if (pull?.head.sha) {
      sha = pull?.head.sha
    }
  }

  return sha
}

export function getPullRequestNumber(): number | undefined {
  let pr_number = undefined
  if (isPullRequest()) {
    const pull = context.payload.pull_request as PullRequest
    if (pull?.number) {
      pr_number = pull.number
    }
  }

  return pr_number
}

export function relativizePath(path: string): string {
  let repo = process.env.GITHUB_REPOSITORY ?? "undefined"
  let repo_owner = process.env.GITHUB_REPOSITORY_OWNER ?? "undefined"
  let repo_name = repo.substring(repo_owner.length + 1)
    info(repo_name)
    info(path)
  // path is in the format of ../workspace/{GITHUB_REPO}/{RELATIVE_PATH}
  return path.substring(path.lastIndexOf(repo_name) + repo_name.length + 1)
}
