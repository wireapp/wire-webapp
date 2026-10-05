/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 *
 */

import {sharedDriveDirectUploadFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {PageManager} from 'test/e2e_tests/pageManager';
import {AudioFileName, getAudioFilePath, getTextFilePath, TextFileName} from 'test/e2e_tests/utils/asset.util';

import {test, expect, withLogin} from '../../test.fixtures';
import {connectWithUser, createGroup} from '../../utils/userActions';

test.describe('Drive file uploads with direct upload disabled', () => {
  let pageManager: PageManager;

  test.beforeEach(async ({createTeam, createPage, createUser}) => {
    const teamMember = await createUser();
    const team = await createTeam('Drive upload team', {
      users: [teamMember],
      features: {cells: true},
    });
    pageManager = await PageManager.from(
      createPage(
        withLogin(team.owner, {
          startupFeatureToggles: {
            [sharedDriveDirectUploadFeatureToggleName]: false,
          },
        }),
      ),
    );
    const {pages} = pageManager.webapp;

    await connectWithUser(pageManager, teamMember);
    await createGroup(pages, 'Drive upload conversation', [teamMember], {cells: true});
    await pages.conversationList().getConversation('Drive upload conversation').open();
    await pages.conversation().clickFilesTab();
    await expect(pages.cellsSharedDrive().newButton).toBeVisible();
  });

  test('does not expose file upload', {tag: ['@functional']}, async () => {
    const sharedDrive = pageManager.webapp.pages.cellsSharedDrive();

    await sharedDrive.newButton.click();
    await expect(sharedDrive.uploadFileMenuItem).not.toBeVisible();
  });
});

test.describe('Drive file uploads', () => {
  let pageManager: PageManager;

  test.beforeEach(async ({createTeam, createPage, createUser}) => {
    const teamMember = await createUser();
    const team = await createTeam('Drive upload team', {
      users: [teamMember],
      features: {cells: true},
    });
    pageManager = await PageManager.from(
      createPage(
        withLogin(team.owner, {
          startupFeatureToggles: {
            [sharedDriveDirectUploadFeatureToggleName]: true,
          },
        }),
      ),
    );
    const {pages} = pageManager.webapp;

    await test.step('Preconditions: Create and open a conversation with Shared Drive enabled', async () => {
      const conversationName = 'Drive upload conversation';
      await connectWithUser(pageManager, teamMember);
      await createGroup(pages, conversationName, [teamMember], {cells: true});
      await pages.conversationList().getConversation(conversationName).open();
      await pages.conversation().clickFilesTab();
      await expect(pages.cellsSharedDrive().newButton).toBeVisible();
    });
  });

  test('I want to upload a single file to Drive', {tag: ['@TC-12131', '@functional']}, async () => {
    const {pages} = pageManager.webapp;
    const sharedDrive = pages.cellsSharedDrive();

    await test.step('User uploads one file', async () => {
      await sharedDrive.uploadFile(getTextFilePath());
    });

    await test.step('Uploaded file is visible in Drive', async () => {
      await expect(sharedDrive.uploadStatusHeader).toContainText(`Uploaded ${TextFileName}`);

      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
    });
  });

  test('I want to upload multiple files to Drive', {tag: ['@TC-12133', '@functional']}, async () => {
    const {pages} = pageManager.webapp;
    const sharedDrive = pages.cellsSharedDrive();

    await test.step('User uploads multiple files', async () => {
      await sharedDrive.uploadFile([getTextFilePath(), getAudioFilePath()]);
    });

    await test.step('Uploaded files are visible in Drive', async () => {
      await expect(sharedDrive.uploadStatusHeader.getByRole('status')).toContainText('Uploaded 2 items');

      await expect(async () => {
        await sharedDrive.refresh();
        await expect(sharedDrive.getFile(TextFileName)).toBeVisible({timeout: 2_000});
        await expect(sharedDrive.getFile(AudioFileName)).toBeVisible({timeout: 2_000});
      }).toPass({intervals: [1_000, 2_000, 5_000], timeout: 20_000});
    });
  });
});
