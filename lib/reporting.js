"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiffMap = exports.createIssueCommentMessage = exports.createReviewCommentMessage = exports.createNoLongerPresentMessage = exports.isPresent = exports.COMMENT_PREFACE = exports.UNKNOWN_FILE = exports.NOT_PRESENT = exports.PRESENT = void 0;
const github_context_1 = require("./github/github-context");
exports.PRESENT = 'PRESENT';
exports.NOT_PRESENT = 'NOT_PRESENT';
exports.UNKNOWN_FILE = 'Unknown File';
exports.COMMENT_PREFACE = '<!-- Comment managed by coverity-report-output-v7 action, do not modify!';
function isPresent(existingMessage) {
    const lines = existingMessage.split('\n');
    return lines.length > 3 && lines[2] !== exports.NOT_PRESENT;
}
exports.isPresent = isPresent;
function createNoLongerPresentMessage(existingMessage) {
    const existingMessageLines = existingMessage.split('\n');
    return `${existingMessageLines[0]}
${existingMessageLines[1]}
${exports.NOT_PRESENT}
-->

Coverity issue no longer present as of: ${process.env.GITHUB_SHA}
<details>
<summary>Show issue</summary>

${existingMessageLines.slice(4).join('\n')}
</details>`;
}
exports.createNoLongerPresentMessage = createNoLongerPresentMessage;
function createReviewCommentMessage(issue) {
    const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName;
    const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : '';
    const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown';
    const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : '';
    const mainEvent = issue.events.find(event => event.main === true);
    const mainEventDescription = mainEvent ? mainEvent.eventDescription : '';
    const remediationEvent = issue.events.find(event => event.remediation === true);
    const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : '';
    return `${exports.COMMENT_PREFACE}
${issue.mergeKey}
${exports.PRESENT}
-->

# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_${checkerNameString}

${remediationString}
`;
}
exports.createReviewCommentMessage = createReviewCommentMessage;
function createIssueCommentMessage(issue) {
    const message = createReviewCommentMessage(issue);
    const relativePath = (0, github_context_1.relativizePath)(issue.mainEventFilePathname);
    return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it at:
[${relativePath}:${issue.mainEventLineNumber}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA}/${relativePath}#L${issue.mainEventLineNumber})
`;
}
exports.createIssueCommentMessage = createIssueCommentMessage;
function getDiffMap(rawDiff) {
    var _a;
    console.info('Gathering diffs...');
    const diffMap = new Map();
    let path = exports.UNKNOWN_FILE;
    for (const line of rawDiff.split('\n')) {
        if (line.startsWith('diff --git')) {
            // TODO: Handle spaces in path
            path = `${process.env.GITHUB_WORKSPACE}/${line.split(' ')[2].substring(2)}`;
            if (path === undefined) {
                path = exports.UNKNOWN_FILE;
            }
            diffMap.set(path, []);
        }
        if (line.startsWith('@@')) {
            let changedLines = line.substring(3);
            changedLines = changedLines.substring(0, changedLines.indexOf(' @@'));
            const linesAddedPosition = changedLines.indexOf('+');
            if (linesAddedPosition > -1) {
                // We only care about the right side because Coverity can only analyze what's there, not what used to be --rotte FEB 2022
                const linesAddedString = changedLines.substring(linesAddedPosition + 1);
                const separatorPosition = linesAddedString.indexOf(',');
                const startLine = parseInt(linesAddedString.substring(0, separatorPosition));
                const lineCount = parseInt(linesAddedString.substring(separatorPosition + 1));
                const endLine = startLine + lineCount - 1;
                if (!diffMap.has(path)) {
                    diffMap.set(path, []);
                }
                console.info(`Added ${path}: ${startLine} to ${endLine}`);
                (_a = diffMap.get(path)) === null || _a === void 0 ? void 0 : _a.push({ firstLine: startLine, lastLine: endLine });
            }
        }
    }
    return diffMap;
}
exports.getDiffMap = getDiffMap;
