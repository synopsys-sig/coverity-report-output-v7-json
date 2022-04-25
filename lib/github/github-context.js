"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relativizePath = exports.getPullRequestNumber = exports.getSha = exports.isPullRequest = void 0;
const github_1 = require("@actions/github");
const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];
function isPullRequest() {
    return prEvents.includes(github_1.context.eventName);
}
exports.isPullRequest = isPullRequest;
function getSha() {
    let sha = github_1.context.sha;
    if (isPullRequest()) {
        const pull = github_1.context.payload.pull_request;
        if (pull === null || pull === void 0 ? void 0 : pull.head.sha) {
            sha = pull === null || pull === void 0 ? void 0 : pull.head.sha;
        }
    }
    return sha;
}
exports.getSha = getSha;
function getPullRequestNumber() {
    let pr_number = undefined;
    if (isPullRequest()) {
        const pull = github_1.context.payload.pull_request;
        if (pull === null || pull === void 0 ? void 0 : pull.number) {
            pr_number = pull.number;
        }
    }
    return pr_number;
}
exports.getPullRequestNumber = getPullRequestNumber;
function relativizePath(path) {
    var _a;
    let length = (_a = process.env.GITHUB_WORKSPACE) === null || _a === void 0 ? void 0 : _a.length;
    if (!length) {
        length = 'undefined'.length;
    }
    return path.substring(length + 1);
}
exports.relativizePath = relativizePath;
