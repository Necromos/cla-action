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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = __importDefault(require("./octokit"));
const github_1 = require("@actions/github");
const core = __importStar(require("@actions/core"));
const addEmptyCommit_1 = require("./addEmptyCommit");
const blockChainWebhook_1 = __importDefault(require("./blockChainWebhook"));
function signatureWithPRComment(commentId, committerMap, committers, pullRequestNo) {
    return __awaiter(this, void 0, void 0, function* () {
        const blockchainFlag = core.getInput('blockchain-storage-flag');
        const emptyCommitFlag = core.getInput('empty-commit-flag');
        let repoId = github_1.context.payload.repository.id;
        let commentedCommitterMap = {};
        let prResponse = yield octokit_1.default.issues.listComments({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            issue_number: github_1.context.issue.number
        });
        let listOfPRComments = [];
        let filteredListOfPRComments = [];
        //TODO: Do null check for repoID
        prResponse.data.map((prComment) => {
            listOfPRComments.push({
                name: prComment.user.login,
                id: prComment.user.id,
                comment_id: prComment.id,
                body: prComment.body.toLowerCase(),
                created_at: prComment.created_at,
                repoId: repoId,
                pullRequestNo: pullRequestNo
            });
        });
        listOfPRComments.map((comment) => {
            if (comment.body.match(/^.*i \s*have \s*read \s*the \s*cla \s*document \s*and \s*i \s*hereby \s*sign \s*the \s*cla.*$/) && comment.name !== 'github-actions[bot]') {
                filteredListOfPRComments.push(comment);
            }
        });
        for (var i = 0; i < filteredListOfPRComments.length; i++) {
            delete filteredListOfPRComments[i].body;
        }
        // //checking if the reacted committers are not the signed committers(not in the storage file) and filtering only the unsigned committers
        commentedCommitterMap.newSigned = filteredListOfPRComments.filter(commentedCommitter => committerMap.notSigned.some(notSignedCommitter => commentedCommitter.id === notSignedCommitter.id));
        if (github_1.context.eventName === "issue_comment") {
            //Do empty commit only when the contributor signs the CLA with the PR comment and then check if the comment is from the newsigned contributor
            if (emptyCommitFlag == 'true') {
                core.debug(JSON.stringify(github_1.context.payload.comment.user.id));
                if (commentedCommitterMap.newSigned.some(contributor => contributor.id === github_1.context.payload.comment.user.id)) {
                    core.debug("Adding empty commit for the signee");
                    yield addEmptyCommit_1.addEmptyCommit();
                }
            }
        }
        core.debug("the new commented committers(signed) are :" + JSON.stringify(commentedCommitterMap.newSigned, null, 3));
        if (blockchainFlag == 'true' && commentedCommitterMap.newSigned) {
            yield blockChainWebhook_1.default(commentedCommitterMap.newSigned);
        }
        //checking if the commented users are only the contributors who has committed in the same PR (This is needed for the PR Comment and changing the status to success when all the contributors has reacted to the PR)
        commentedCommitterMap.onlyCommitters = committers.filter(committer => filteredListOfPRComments.some(commentedCommitter => committer.id == commentedCommitter.id));
        core.debug("the reacted signed committers comments are " + JSON.stringify(commentedCommitterMap.onlyCommitters, null, 3));
        return commentedCommitterMap;
    });
}
exports.default = signatureWithPRComment;
