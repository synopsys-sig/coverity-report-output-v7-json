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
exports.cleanUrl = exports.CoverityApiService = exports.KEY_LAST_SNAPSHOT_ID = exports.KEY_FIRST_SNAPSHOT_ID = exports.KEY_CLASSIFICATION = exports.KEY_ACTION = exports.KEY_MERGE_KEY = exports.KEY_CID = void 0;
const core_1 = require("@actions/core");
const Handlers_1 = require("typed-rest-client/Handlers");
const RestClient_1 = require("typed-rest-client/RestClient");
const application_constants_1 = require("./application-constants");
exports.KEY_CID = 'cid';
exports.KEY_MERGE_KEY = 'mergeKey';
exports.KEY_ACTION = 'action';
exports.KEY_CLASSIFICATION = 'classification';
exports.KEY_FIRST_SNAPSHOT_ID = 'firstSnapshotId';
exports.KEY_LAST_SNAPSHOT_ID = 'lastDetectedId';
class CoverityApiService {
    constructor(coverityUrl, coverityUsername, coverityPassword) {
        this.coverityUrl = cleanUrl(coverityUrl);
        const authHandler = new Handlers_1.BasicCredentialHandler(coverityUsername, coverityPassword, true);
        this.restClient = new RestClient_1.RestClient(application_constants_1.APPLICATION_NAME, this.coverityUrl, [authHandler], {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }
    findIssues(projectName, offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestBody = {
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
                columns: [exports.KEY_CID, exports.KEY_MERGE_KEY, exports.KEY_ACTION, exports.KEY_CLASSIFICATION, exports.KEY_FIRST_SNAPSHOT_ID, exports.KEY_LAST_SNAPSHOT_ID]
            };
            const queryParameters = {
                params: {
                    locale: 'en_us',
                    offset,
                    rowCount: limit,
                    includeColumnLabels: 'true',
                    queryType: 'bySnapshot',
                    sortOrder: 'asc'
                }
            };
            // For SIGINT-90
            (0, core_1.debug)(`Requesting from Coverity Server: endpoint: /api/v2/issues/search params: ${JSON.stringify(queryParameters)} body: ${JSON.stringify(requestBody)}`);
            const response = yield this.restClient.create('/api/v2/issues/search', requestBody, { queryParameters });
            if (response.statusCode < 200 || response.statusCode >= 300) {
                (0, core_1.debug)(`Coverity response error: ${response.result}`);
                return Promise.reject(`Failed to retrieve issues from Coverity for project '${projectName}': ${response.statusCode}`);
            }
            return Promise.resolve(response.result);
        });
    }
}
exports.CoverityApiService = CoverityApiService;
function cleanUrl(url) {
    if (url && url.endsWith('/')) {
        return url.slice(0, url.length - 1);
    }
    return url;
}
exports.cleanUrl = cleanUrl;
