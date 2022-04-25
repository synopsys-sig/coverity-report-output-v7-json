"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIssueComment = exports.updateExistingIssueComment = exports.getExistingIssueComments = exports.createReview = exports.updateExistingReviewComment = exports.getExistingReviewComments = exports.getPullRequestDiff = void 0;
const github_1 = require("@actions/github");
const inputs_1 = require("../inputs");
const github_context_1 = require("./github-context");
function getPullRequestDiff() {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        const pullRequestNumber = (0, github_context_1.getPullRequestNumber)();
        if (!pullRequestNumber) {
            return Promise.reject(Error('Could not get Pull Request Diff: Action was not running on a Pull Request'));
        }
        const response = yield octokit.rest.pulls.get({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            pull_number: pullRequestNumber,
            mediaType: {
                format: 'diff'
            }
        });
        return response.data;
    });
}
exports.getPullRequestDiff = getPullRequestDiff;
function getExistingReviewComments() {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        const pullRequestNumber = (0, github_context_1.getPullRequestNumber)();
        if (!pullRequestNumber) {
            return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'));
        }
        const reviewCommentsResponse = yield octokit.rest.pulls.listReviewComments({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            pull_number: pullRequestNumber
        });
        return reviewCommentsResponse.data;
    });
}
exports.getExistingReviewComments = getExistingReviewComments;
function updateExistingReviewComment(commentId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        octokit.rest.pulls.updateReviewComment({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            comment_id: commentId,
            body
        });
    });
}
exports.updateExistingReviewComment = updateExistingReviewComment;
function createReview(comments, event = 'COMMENT') {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        const pullRequestNumber = (0, github_context_1.getPullRequestNumber)();
        if (!pullRequestNumber) {
            return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'));
        }
        octokit.rest.pulls.createReview({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            pull_number: pullRequestNumber,
            event,
            comments
        });
    });
}
exports.createReview = createReview;
function getExistingIssueComments() {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        const { data: existingComments } = yield octokit.rest.issues.listComments({
            issue_number: github_1.context.issue.number,
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo
        });
        return existingComments;
    });
}
exports.getExistingIssueComments = getExistingIssueComments;
function updateExistingIssueComment(commentId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        octokit.rest.issues.updateComment({
            issue_number: github_1.context.issue.number,
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            comment_id: commentId,
            body
        });
    });
}
exports.updateExistingIssueComment = updateExistingIssueComment;
function createIssueComment(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, github_1.getOctokit)(inputs_1.GITHUB_TOKEN);
        octokit.rest.issues.createComment({
            issue_number: github_1.context.issue.number,
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            body
        });
    });
}
exports.createIssueComment = createIssueComment;
