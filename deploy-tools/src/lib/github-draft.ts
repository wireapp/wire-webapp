/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 */

import axios from 'axios';
import fs from 'fs-extra';

import {TWO_HUNDRED_MB_IN_BYTES} from './deploy-utils';

/** @see https://developer.github.com/v3/repos/releases/#create-a-release */
interface GitHubAPIDraftData {
  assets_url: string;
  body: string;
  created_at: string;
  draft: boolean;
  html_url: string;
  id: number;
  name: string;
  node_id: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
  tarball_url: string;
  target_commitish: string;
  upload_url: string;
  url: string;
  zipball_url: string;
}

/** @see https://developer.github.com/v3/repos/releases/#create-a-release */
interface GitHubAPICreateDraftOptions {
  /** Text describing the contents of the tag. */
  body?: string;
  /**
   * `true` to create a draft (unpublished) release,
   * `false` to create a published one. Default: `false`
   */
  draft?: boolean;
  /** The name of the release. */
  name?: string;
  /**
   * `true` to identify the release as a prerelease.
   * `false` to identify the release as a full release. Default: `false`
   */
  prerelease?: boolean;
  /** **Required**. The name of the tag. */
  tag_name: string;
  /**
   * Specifies the commitish value that determines where the Git tag is created from.
   * Can be any branch or commit SHA. Unused if the Git tag already exists.
   * Default: the repository's default branch (usually `master`).
   */
  target_commitish?: string;
}

interface GitHubOptions {
  githubToken: string;
  repoSlug: string;
}

interface GitHubDraftOptions extends GitHubOptions {
  changelog: string;
  commitish: string;
  tagName: string;
  title: string;
}

interface GitHubUploadOptions extends GitHubOptions {
  draftId: number;
  fileName: string;
  filePath: string;
}

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_UPLOADS_URL = 'https://uploads.github.com';

async function createDraft(options: GitHubDraftOptions): Promise<GitHubAPIDraftData> {
  const {changelog, commitish, githubToken, repoSlug, tagName, title} = options;

  const draftUrl = `${GITHUB_API_URL}/repos/${repoSlug}/releases`;

  const draftData: GitHubAPICreateDraftOptions = {
    body: changelog,
    draft: true,
    name: title,
    prerelease: false,
    tag_name: tagName,
    target_commitish: commitish,
  };

  const AuthorizationHeaders = {
    Authorization: `token ${githubToken}`,
  };

  try {
    const draftResponse = await axios.post<GitHubAPIDraftData>(draftUrl, draftData, {headers: AuthorizationHeaders});
    return draftResponse.data;
  } catch (error) {
    console.error('Error response from GitHub:', error.response.data);
    throw new Error(
      `Draft creation failed with status code "${error.response.status}": "${error.response.statusText}"`
    );
  }
}

async function uploadAsset(options: GitHubUploadOptions): Promise<void> {
  const {draftId, fileName, filePath, githubToken, repoSlug} = options;

  const draftUrl = `${GITHUB_API_URL}/repos/${repoSlug}/releases`;
  const uploadUrl = `${GITHUB_UPLOADS_URL}/repos/${repoSlug}/releases/${draftId}/assets`;

  const AuthorizationHeaders = {
    Authorization: `token ${githubToken}`,
  };

  const headers = {
    ...AuthorizationHeaders,
    'Content-type': 'application/binary',
  };
  const file = await fs.readFile(filePath);

  try {
    await axios.post(`${uploadUrl}?name=${fileName}`, file, {headers, maxContentLength: TWO_HUNDRED_MB_IN_BYTES});
  } catch (uploadError) {
    console.error('Error response from GitHub:', uploadError.response.data);
    console.error(
      `Upload failed with status code "${uploadError.response.status}": ${uploadError.response.statusText}"`
    );
    console.info('Deleting draft because upload failed ...');

    try {
      await axios.delete(draftUrl, {headers: AuthorizationHeaders});
      console.info('Draft deleted');
    } catch (deleteError) {
      console.error('Error response from GitHub:', deleteError.response.data);
      throw new Error(
        `Deletion failed with status code "${deleteError.response.status}: ${deleteError.response.statusText}"`
      );
    } finally {
      throw new Error('Uploading asset failed');
    }
  }
}

export {
  createDraft,
  uploadAsset,
  GitHubAPIDraftData as GitHubDraftData,
  GitHubOptions,
  GitHubDraftOptions,
  GitHubUploadOptions,
};
