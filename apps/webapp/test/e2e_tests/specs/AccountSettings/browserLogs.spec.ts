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

import {Uint8ArrayReader, Uint8ArrayWriter, ZipReader} from '@zip.js/zip.js/index-native.js';

import {PageManager} from '../../pageManager';
import {expect, test, withLogin} from '../../test.fixtures';
import {logDirectoryName} from '../../../../src/script/logger/logPersistenceConfiguration';

test('downloads browser logs through a real Chromium writable file stream', async ({createPage, createUser}) => {
  const user = await createUser();
  const page = await createPage(
    async page => {
      await page.addInitScript(() => {
        // Replace only the OS dialog. Keep native createWritable, write, and close.
        window.showSaveFilePicker = async function selectLogDestination(options: {
          readonly suggestedName?: string;
        }): Promise<FileSystemFileHandle> {
          document.documentElement.dataset.logPickerActivation = String(navigator.userActivation.isActive);
          document.documentElement.dataset.logPickerFilename = options.suggestedName;
          const root = await navigator.storage.getDirectory();

          return root.getFileHandle('browser-log-download-test.zip', {create: true});
        };
      });
    },
    withLogin(user, {startupFeatureToggles: {'persistent-browser-logs': true}}),
  );
  const accountIdentifier = 'a'.repeat(64);
  const sessionIdentifier = '00000000-0000-4000-8000-000000000001';
  const midnightMilliseconds = Date.UTC(2025, 10, 18);
  const olderAccountTimestamp = midnightMilliseconds + 1000;
  const logFiles = [
    {
      sourceFilename: `log-${midnightMilliseconds - 1}-${sessionIdentifier}-1.jsonl`,
      archivePath: '2025-11-17/application.jsonl',
      contents: '{"msg":"unattributed browser log"}\n',
    },
    {
      sourceFilename: `log-${olderAccountTimestamp}-${sessionIdentifier}-2-${accountIdentifier}.jsonl`,
      archivePath: `2025-11-18/accounts/${accountIdentifier}/application.old.${olderAccountTimestamp}-0.jsonl`,
      contents: '{"msg":"older account browser log"}\n',
    },
    {
      sourceFilename: `log-${olderAccountTimestamp + 1}-${sessionIdentifier}-3-${accountIdentifier}.jsonl`,
      archivePath: `2025-11-18/accounts/${accountIdentifier}/application.jsonl`,
      contents: '{"msg":"newest account browser log"}\n',
    },
  ];
  await page.evaluate(
    async options => {
      const {directoryName, logFiles} = options;
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(directoryName, {create: true});
      for (const {sourceFilename, contents} of logFiles) {
        const file = await directory.getFileHandle(sourceFilename, {create: true});
        const writable = await file.createWritable();
        await writable.write(contents);
        await writable.close();
      }
    },
    {directoryName: logDirectoryName, logFiles},
  );

  const {components} = PageManager.from(page).webapp;
  await components.conversationSidebar().clickPreferencesButton();
  await page.getByRole('button', {name: 'About', exact: true}).click();
  const downloadButton = page.getByTestId('download-browser-logs');
  await downloadButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-log-picker-activation', 'true');
  await expect(page.locator('html')).toHaveAttribute(
    'data-log-picker-filename',
    /^wire-logs-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}Z\.zip$/,
  );
  await expect(downloadButton).toBeEnabled();
  await expect(page.getByRole('alert')).not.toBeVisible();

  const archiveBytes = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('browser-log-download-test.zip');
    const file = await handle.getFile();

    return Array.from(new Uint8Array(await file.arrayBuffer()));
  });
  const reader = new ZipReader(new Uint8ArrayReader(Uint8Array.from(archiveBytes)), {
    checkCrc32: true,
    useWebWorkers: false,
  });
  try {
    const entries = await reader.getEntries();
    const expectedLogs = new Map(
      logFiles.map(logFile => {
        return [logFile.archivePath, logFile.contents];
      }),
    );
    const archivedLogs = new Map<string, string>();
    for (const entry of entries) {
      if (expectedLogs.has(entry.filename)) {
        if (entry.directory) {
          throw new Error('Expected a log file in the archive');
        }
        const contents = await entry.getData(new Uint8ArrayWriter());
        archivedLogs.set(entry.filename, new TextDecoder().decode(contents));
      }
    }
    expect(archivedLogs).toEqual(expectedLogs);
  } finally {
    await reader.close();
  }
});
