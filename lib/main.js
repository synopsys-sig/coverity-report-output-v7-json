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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const pull_request_1 = require("./github/pull-request");
const reporting_1 = require("./reporting");
const github_context_1 = require("./github/github-context");
const inputs_1 = require("./inputs");
const core_1 = require("@actions/core");
const issue_mapper_1 = require("./issue-mapper");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, github_context_1.isPullRequest)()) {
            (0, core_1.info)('Not a Pull Request. Nothing to do...');
            return Promise.resolve();
        }
        (0, core_1.info)(`Using JSON file path: ${inputs_1.JSON_FILE_PATH}`);
        // TODO validate file exists and is .json?
        const jsonV7Content = fs_1.default.readFileSync(inputs_1.JSON_FILE_PATH);
        const coverityIssues = JSON.parse(jsonV7Content.toString());
        let mergeKeyToIssue = new Map();
        const canCheckCoverity = inputs_1.COVERITY_URL && inputs_1.COVERITY_USERNAME && inputs_1.COVERITY_PASSWORD && inputs_1.COVERITY_PROJECT_NAME;
        if (!canCheckCoverity) {
            (0, core_1.warning)('Missing Coverity Connect info. Issues will not be checked against the server.');
        }
        else {
            const allMergeKeys = coverityIssues.issues.map(issue => issue.mergeKey);
            const allUniqueMergeKeys = new Set(allMergeKeys);
            if (canCheckCoverity && coverityIssues && coverityIssues.issues.length > 0) {
                try {
                    mergeKeyToIssue = yield (0, issue_mapper_1.mapMatchingMergeKeys)(allUniqueMergeKeys);
                }
                catch (error) {
                    (0, core_1.setFailed)(error);
                    return Promise.reject();
                }
            }
        }
        const newReviewComments = [];
        const actionReviewComments = yield (0, pull_request_1.getExistingReviewComments)().then(comments => comments.filter(comment => comment.body.includes(reporting_1.COMMENT_PREFACE)));
        const actionIssueComments = yield (0, pull_request_1.getExistingIssueComments)().then(comments => comments.filter(comment => { var _a; return (_a = comment.body) === null || _a === void 0 ? void 0 : _a.includes(reporting_1.COMMENT_PREFACE); }));
        const diffMap = yield (0, pull_request_1.getPullRequestDiff)().then(reporting_1.getDiffMap);
        for (const issue of coverityIssues.issues) {
            (0, core_1.info)(`Found Coverity Issue ${issue.mergeKey} at ${issue.mainEventFilePathname}:${issue.mainEventLineNumber}`);
            const projectIssue = mergeKeyToIssue.get(issue.mergeKey);
            let ignoredOnServer = false;
            let newOnServer = true;
            if (projectIssue) {
                ignoredOnServer = projectIssue.action == 'Ignore' || projectIssue.classification in ['False Positive', 'Intentional'];
                newOnServer = projectIssue.firstSnapshotId == projectIssue.lastSnapshotId;
                (0, core_1.info)(`Issue state on server: ignored=${ignoredOnServer}, new=${newOnServer}`);
            }
            const reviewCommentBody = (0, reporting_1.createReviewCommentMessage)(issue);
            const issueCommentBody = (0, reporting_1.createIssueCommentMessage)(issue);
            const reviewCommentIndex = actionReviewComments.findIndex(comment => comment.line === issue.mainEventLineNumber && comment.body.includes(issue.mergeKey));
            let existingMatchingReviewComment = undefined;
            if (reviewCommentIndex !== -1) {
                existingMatchingReviewComment = actionReviewComments.splice(reviewCommentIndex, 1)[0];
            }
            const issueCommentIndex = actionIssueComments.findIndex(comment => { var _a; return (_a = comment.body) === null || _a === void 0 ? void 0 : _a.includes(issue.mergeKey); });
            let existingMatchingIssueComment = undefined;
            if (issueCommentIndex !== -1) {
                existingMatchingIssueComment = actionIssueComments.splice(issueCommentIndex, 1)[0];
            }
            if (existingMatchingReviewComment !== undefined) {
                (0, core_1.info)(`Issue already reported in comment ${existingMatchingReviewComment.id}, updating if necessary...`);
                if (existingMatchingReviewComment.body !== reviewCommentBody) {
                    (0, pull_request_1.updateExistingReviewComment)(existingMatchingReviewComment.id, reviewCommentBody);
                }
            }
            else if (existingMatchingIssueComment !== undefined) {
                (0, core_1.info)(`Issue already reported in comment ${existingMatchingIssueComment.id}, updating if necessary...`);
                if (existingMatchingIssueComment.body !== issueCommentBody) {
                    (0, pull_request_1.updateExistingIssueComment)(existingMatchingIssueComment.id, issueCommentBody);
                }
            }
            else if (ignoredOnServer) {
                (0, core_1.info)('Issue ignored on server, no comment needed.');
            }
            else if (!newOnServer) {
                (0, core_1.info)('Issue already existed on server, no comment needed.');
            }
            else if (isInDiff(issue, diffMap)) {
                (0, core_1.info)('Issue not reported, adding a comment to the review.');
                newReviewComments.push(createReviewComment(issue, reviewCommentBody));
            }
            else {
                (0, core_1.info)('Issue not reported, adding an issue comment.');
                (0, pull_request_1.createIssueComment)(issueCommentBody);
            }
        }
        for (const comment of actionReviewComments) {
            if ((0, reporting_1.isPresent)(comment.body)) {
                (0, core_1.info)(`Comment ${comment.id} represents a Coverity issue which is no longer present, updating comment to reflect resolution.`);
                (0, pull_request_1.updateExistingReviewComment)(comment.id, (0, reporting_1.createNoLongerPresentMessage)(comment.body));
            }
        }
        for (const comment of actionIssueComments) {
            if (comment.body !== undefined && (0, reporting_1.isPresent)(comment.body)) {
                (0, core_1.info)(`Comment ${comment.id} represents a Coverity issue which is no longer present, updating comment to reflect resolution.`);
                (0, pull_request_1.updateExistingReviewComment)(comment.id, (0, reporting_1.createNoLongerPresentMessage)(comment.body));
            }
        }
        if (newReviewComments.length > 0) {
            (0, core_1.info)('Publishing review...');
            (0, pull_request_1.createReview)(newReviewComments);
        }
        (0, core_1.info)(`Found ${coverityIssues.issues.length} Coverity issues.`);
    });
}
function isInDiff(issue, diffMap) {
    const diffHunks = diffMap.get(issue.mainEventFilePathname);
    if (!diffHunks) {
        return false;
    }
    return diffHunks.filter(hunk => hunk.firstLine <= issue.mainEventLineNumber).some(hunk => issue.mainEventLineNumber <= hunk.lastLine);
}
function createReviewComment(issue, commentBody) {
    return {
        path: (0, github_context_1.relativizePath)(issue.mainEventFilePathname),
        body: commentBody,
        line: issue.mainEventLineNumber,
        side: 'RIGHT'
    };
}
run();
