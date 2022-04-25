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
exports.mapMatchingMergeKeys = exports.ProjectIssue = void 0;
const core_1 = require("@actions/core");
const coverity_api_1 = require("./coverity-api");
const inputs_1 = require("./inputs");
const PAGE_SIZE = 500;
class ProjectIssue {
    constructor(cid, mergeKey, action, classification, firstSnapshotId, lastSnapshotId) {
        this.cid = cid;
        this.mergeKey = mergeKey;
        this.action = action;
        this.classification = classification;
        this.firstSnapshotId = firstSnapshotId;
        this.lastSnapshotId = lastSnapshotId;
    }
}
exports.ProjectIssue = ProjectIssue;
// FIXME This is very inefficient for projects with lots of issues. When filtering by mergeKey is fixed, we should use that instead.
function mapMatchingMergeKeys(relevantMergeKeys) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.info)('Checking Coverity server for existing issues...');
        const apiService = new coverity_api_1.CoverityApiService(inputs_1.COVERITY_URL, inputs_1.COVERITY_USERNAME, inputs_1.COVERITY_PASSWORD);
        let totalRows = 0;
        let offset = 0;
        const mergeKeyToProjectIssue = new Map();
        while (offset <= totalRows && mergeKeyToProjectIssue.size < relevantMergeKeys.size) {
            try {
                const covProjectIssues = yield apiService.findIssues(inputs_1.COVERITY_PROJECT_NAME, offset, PAGE_SIZE);
                totalRows = covProjectIssues.totalRows;
                (0, core_1.debug)(`Found ${covProjectIssues === null || covProjectIssues === void 0 ? void 0 : covProjectIssues.rows.length} potentially matching issues on the server`);
                covProjectIssues.rows
                    .map(row => toProjectIssue(row))
                    .filter(projectIssue => projectIssue.mergeKey != null)
                    .filter(projectIssue => relevantMergeKeys.has(projectIssue.mergeKey))
                    .forEach(projectIssue => mergeKeyToProjectIssue.set(projectIssue.mergeKey, projectIssue));
            }
            catch (error) {
                return Promise.reject(error);
            }
            offset += PAGE_SIZE;
        }
        (0, core_1.info)(`Found ${mergeKeyToProjectIssue.size} existing issues`);
        return mergeKeyToProjectIssue;
    });
}
exports.mapMatchingMergeKeys = mapMatchingMergeKeys;
function toProjectIssue(issueRows) {
    let cid = '';
    let mergeKey = null;
    let action = '';
    let classification = '';
    let firstSnapshotId = '';
    let lastSnapshotId = '';
    for (const issueCol of issueRows) {
        if (issueCol.key == coverity_api_1.KEY_CID) {
            cid = issueCol.value;
        }
        else if (issueCol.key == coverity_api_1.KEY_MERGE_KEY) {
            mergeKey = issueCol.value;
        }
        else if (issueCol.key == coverity_api_1.KEY_ACTION) {
            action = issueCol.value;
        }
        else if (issueCol.key == coverity_api_1.KEY_CLASSIFICATION) {
            classification = issueCol.value;
        }
        else if (issueCol.key == coverity_api_1.KEY_FIRST_SNAPSHOT_ID) {
            firstSnapshotId = issueCol.value;
        }
        else if (issueCol.key == coverity_api_1.KEY_LAST_SNAPSHOT_ID) {
            lastSnapshotId = issueCol.value;
        }
    }
    return new ProjectIssue(cid, mergeKey, action, classification, firstSnapshotId, lastSnapshotId);
}
