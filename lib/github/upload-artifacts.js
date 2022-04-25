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
exports.uploadArtifact = void 0;
const artifact_1 = require("@actions/artifact");
const core_1 = require("@actions/core");
function uploadArtifact(name, outputPath, files) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactClient = (0, artifact_1.create)();
        const options = {
            continueOnError: false,
            retentionDays: 0
        };
        (0, core_1.info)(`Attempting to upload ${name}...`);
        const uploadResponse = yield artifactClient.uploadArtifact(name, files, outputPath, options);
        if (files.length === 0) {
            (0, core_1.warning)(`Expected to upload ${name}, but the action couldn't find any. Was output-path set correctly?`);
        }
        else if (uploadResponse.failedItems.length > 0) {
            (0, core_1.warning)(`An error was encountered when uploading ${uploadResponse.artifactName}. There were ${uploadResponse.failedItems.length} items that failed to upload.`);
        }
        else {
            (0, core_1.info)(`Artifact ${uploadResponse.artifactName} has been successfully uploaded!`);
        }
    });
}
exports.uploadArtifact = uploadArtifact;
