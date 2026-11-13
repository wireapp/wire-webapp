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

import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';

import {logDirectoryName, logPersistenceConfiguration} from '../../src/script/logger/logPersistenceConfiguration';

type BrowserLogFile = {
  readonly name: string;
  readonly contents: string;
  readonly sizeBytes: number;
};

type LogInspectionRequest = {
  readonly directoryName: string;
  readonly filenames: readonly string[];
  readonly operation: 'read' | 'remove';
};

async function inspectBrowserLogs(page: Page, request: LogInspectionRequest): Promise<readonly BrowserLogFile[]> {
  return page.evaluate(async request => {
    function inspectInWorker(): void {
      self.addEventListener('message', async (event: MessageEvent<LogInspectionRequest>) => {
        const {directoryName, filenames, operation} = event.data;
        try {
          const root = await navigator.storage.getDirectory();
          let directory: FileSystemDirectoryHandle;
          try {
            directory = await root.getDirectoryHandle(directoryName);
          } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'NotFoundError') {
              self.postMessage({files: []});

              return;
            }

            throw error;
          }
          if (operation === 'remove') {
            for (const filename of filenames) {
              await directory.removeEntry(filename);
            }

            self.postMessage({files: []});

            return;
          }

          const files: BrowserLogFile[] = [];
          for await (const entry of directory.values()) {
            if (entry.kind === 'file' && entry.name.startsWith('log-')) {
              const file = await entry.getFile();
              files.push({name: entry.name, contents: await file.text(), sizeBytes: file.size});
            }
          }
          self.postMessage({files});
        } catch {
          self.postMessage({failed: true});
        }
      });
    }

    const script = new Blob([`(${inspectInWorker.toString()})();`], {type: 'application/javascript'});
    const scriptUrl = URL.createObjectURL(script);
    const worker = new Worker(scriptUrl);
    try {
      return await new Promise<readonly BrowserLogFile[]>((resolve, reject) => {
        worker.addEventListener(
          'message',
          (event: MessageEvent<{files: readonly BrowserLogFile[]; failed?: boolean}>) => {
            if (event.data.failed === true) {
              reject(new Error('Log inspection worker failed'));
            } else {
              resolve(event.data.files);
            }
          },
          {once: true},
        );
        worker.addEventListener(
          'error',
          () => {
            reject(new Error('Log inspection worker crashed'));
          },
          {once: true},
        );
        worker.postMessage(request);
      });
    } finally {
      worker.terminate();
      URL.revokeObjectURL(scriptUrl);
    }
  }, request);
}

async function readBrowserLogFiles(page: Page): Promise<readonly BrowserLogFile[]> {
  return inspectBrowserLogs(page, {
    directoryName: logDirectoryName,
    filenames: [],
    operation: 'read',
  });
}

test('loads the native persistence worker and acknowledges append, flush, and shutdown', async ({page, context}) => {
  await context.route('**/browser-log-persistence.js', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: "Object.defineProperty(navigator, 'locks', {value: undefined});\n" + (await response.text()),
    });
  });
  await page.goto('/config.js');
  // Six bounded batches fit within one 10 MiB file and stay below the worker's per-message limit.
  const lines = Array.from({length: 18}, (_, sequence) => {
    return `${JSON.stringify({component: 'BrowserSmoke', msg: '[REDACTED]', sequence, detail: 'x'.repeat(65_536)})}\n`;
  });
  try {
    const outcomes = await page.evaluate(async lines => {
      const worker = new Worker('/min/browser-log-persistence.js', {name: 'browser-log-persistence'});
      const commands = [
        ...Array.from({length: 6}, (_, batchIndex) => {
          return {
            type: 'append',
            requestIdentifier: batchIndex + 2,
            lines: lines.slice(batchIndex * 3, batchIndex * 3 + 3),
          };
        }),
        {type: 'flush', requestIdentifier: 8},
        {type: 'shutdown', requestIdentifier: 9},
      ];
      const remainingCommands = commands.values();
      const responses: unknown[] = [];
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Native persistence worker did not acknowledge its commands'));
          }, 10_000);
          worker.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Native persistence worker failed to load'));
          });
          worker.addEventListener('message', (event: MessageEvent<unknown>) => {
            responses.push(event.data);
            const nextCommand = remainingCommands.next();
            if (nextCommand.done === true) {
              clearTimeout(timeout);
              resolve();
            } else {
              worker.postMessage(nextCommand.value);
            }
          });
          worker.postMessage({type: 'initialize', requestIdentifier: 1});
        });
      } finally {
        worker.terminate();
      }

      return responses;
    }, lines);
    expect(outcomes).toEqual(
      Array.from({length: 9}, (_, index) => {
        return {requestIdentifier: index + 1, outcome: 'complete'};
      }),
    );
    const files = await readBrowserLogFiles(page);
    expect(files).toHaveLength(1);
    for (const file of files) {
      expect(file.sizeBytes).toBeLessThanOrEqual(logPersistenceConfiguration.maximumFileBytes);
    }
    expect(
      files
        .toSorted((left, right) => {
          return left.name.localeCompare(right.name);
        })
        .map(file => {
          return file.contents;
        })
        .join(''),
    ).toBe(lines.join(''));
  } finally {
    const files = await readBrowserLogFiles(page);
    await inspectBrowserLogs(page, {
      directoryName: logDirectoryName,
      filenames: files.map(file => {
        return file.name;
      }),
      operation: 'remove',
    });
  }
});

test('persists sanitized browser logs with console disabled across application reload', async ({page, context}) => {
  // Enforce the application's current script and worker directives without widening either policy.
  await context.route('**/auth?**', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'Content-Security-Policy': "script-src 'self' 'unsafe-eval'; worker-src 'self' blob: data:",
      },
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {
      value(): never {
        document.documentElement.dataset.unexpectedLogStorageAccess = 'true';

        throw new Error('Filesystem work must occur in the worker');
      },
    });
  });
  const consoleRecords: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('{')) {
      consoleRecords.push(message.text());
    }
  });
  const ownedFilenames = new Set<string>();
  const location = '/?enabled-features=mark-as-unread,persistent-browser-logs&enableLogging=-*';
  try {
    await page.goto(location);
    await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
    expect(new URL(page.url()).searchParams.get('enableLogging')).toBe('-*');
    await expect
      .poll(async () => {
        const files = await readBrowserLogFiles(page);

        return files.some(file => {
          return file.contents.includes('configuring APIs with config:');
        });
      })
      .toBe(true);
    const firstSessionFiles = await readBrowserLogFiles(page);
    firstSessionFiles.forEach(file => {
      ownedFilenames.add(file.name);
    });
    expect(firstSessionFiles.length).toBeGreaterThan(0);
    await expect.poll(() => page.workers()).toHaveLength(1);
    for (const worker of page.workers()) {
      expect(new URL(worker.url()).pathname).toBe('/min/browser-log-persistence.js');
    }
    expect(await page.locator('html').getAttribute('data-unexpected-log-storage-access')).toBeNull();
    expect(consoleRecords).toEqual([]);

    await page.reload();
    await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
    expect(new URL(page.url()).searchParams.get('enableLogging')).toBe('-*');
    await expect
      .poll(async () => {
        return (await readBrowserLogFiles(page)).length;
      })
      .toBeGreaterThan(firstSessionFiles.length);
    const secondSessionFiles = await readBrowserLogFiles(page);
    secondSessionFiles.forEach(file => {
      ownedFilenames.add(file.name);
    });
    for (const file of firstSessionFiles) {
      expect(secondSessionFiles).toContainEqual(file);
    }

    const allFiles = await readBrowserLogFiles(page);
    let totalBytes = 0;
    for (const file of allFiles) {
      ownedFilenames.add(file.name);
      totalBytes += file.sizeBytes;
      expect(file.sizeBytes).toBeLessThanOrEqual(logPersistenceConfiguration.maximumFileBytes);
      expect(file.contents.endsWith('\n')).toBe(true);
      for (const line of file.contents.trimEnd().split('\n')) {
        expect(JSON.parse(line)).toMatchObject({component: expect.any(String), msg: expect.any(String)});
      }
    }
    expect(totalBytes).toBeLessThanOrEqual(logPersistenceConfiguration.maximumTotalBytes);
    expect(new URL(page.url()).searchParams.get('enabled-features')).toBe('mark-as-unread,persistent-browser-logs');
    expect(consoleRecords).toEqual([]);
  } finally {
    // Stop the test's writer before removing only the files this isolated browser context created.
    await page.goto('/auth?enabled-features=');
    (await readBrowserLogFiles(page)).forEach(file => {
      ownedFilenames.add(file.name);
    });
    await inspectBrowserLogs(page, {
      directoryName: logDirectoryName,
      filenames: [...ownedFilenames],
      operation: 'remove',
    });
  }
});

test('leaves Origin Private File System untouched without opt-in even when console logging is enabled', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {
      value(): never {
        document.documentElement.dataset.unexpectedLogStorageAccess = 'true';

        throw new Error('Origin Private File System should be disabled');
      },
    });
  });
  const startedWorkers: string[] = [];
  page.on('worker', worker => {
    startedWorkers.push(worker.url());
  });
  const consoleRecords: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('{')) {
      consoleRecords.push(message.text());
    }
  });

  await page.goto('/auth?enabled-features=mark-as-unread&enableLogging=*');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();

  expect(consoleRecords.length).toBeGreaterThan(0);
  expect(startedWorkers).toEqual([]);
  expect(await page.locator('html').getAttribute('data-unexpected-log-storage-access')).toBeNull();
});

test('keeps startup and console logging working when logging worker construction fails', async ({page}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    Object.defineProperty(window, 'Worker', {
      value: function createWorker(source: string | URL, options?: WorkerOptions) {
        if (new URL(source.toString(), window.location.href).pathname.endsWith('/browser-log-persistence.js')) {
          throw new Error('Logging worker construction failed');
        }

        return new NativeWorker(source, options);
      },
    });
  });
  const startedWorkers: string[] = [];
  page.on('worker', worker => {
    startedWorkers.push(worker.url());
  });
  const consoleRecords: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('{')) {
      consoleRecords.push(message.text());
    }
  });
  await page.goto('/?enabled-features=persistent-browser-logs&enableLogging=*');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();

  expect(startedWorkers).toEqual([]);
  expect(consoleRecords.length).toBeGreaterThan(0);
});

test('starts without main-thread filesystem access while worker initialization never settles', async ({
  page,
  context,
}) => {
  await context.route('**/*.js', async route => {
    const isPersistenceWorker = new URL(route.request().url()).pathname.endsWith('/browser-log-persistence.js');
    if (isPersistenceWorker) {
      const response = await route.fetch();
      const prefix = `Object.defineProperty(navigator.storage, 'getDirectory', {value() {
        Reflect.set(globalThis, 'logStorageInitializationStarted', true);
        return new Promise(() => {});
      }});\n`;
      await route.fulfill({response, body: prefix + (await response.text())});
    } else {
      await route.continue();
    }
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {
      value(): never {
        document.documentElement.dataset.unexpectedLogStorageAccess = 'true';

        throw new Error('Filesystem work must occur in the worker');
      },
    });
  });
  await page.goto('/auth?enabled-features=persistent-browser-logs');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  await expect
    .poll(async () => {
      const workers = page.workers();
      const started = await Promise.all(
        workers.map(async worker => {
          return worker.evaluate(() => {
            return Reflect.get(globalThis, 'logStorageInitializationStarted') === true;
          });
        }),
      );

      return started.includes(true);
    })
    .toBe(true);
  expect(await page.locator('html').getAttribute('data-unexpected-log-storage-access')).toBeNull();
  await page.goto('/auth?enabled-features=');
});

test.describe('Electron logging selection', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Electron/38.0.0 Safari/537.36',
  });

  test('never initializes Origin Private File System despite opt-in and preserves console capture', async ({page}) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.storage, 'getDirectory', {
        value(): never {
          document.documentElement.dataset.unexpectedLogStorageAccess = 'true';

          throw new Error('Origin Private File System should be disabled in Electron');
        },
      });
    });
    const startedWorkers: string[] = [];
    page.on('worker', worker => {
      startedWorkers.push(worker.url());
    });
    const consoleRecords: string[] = [];
    page.on('console', message => {
      if (message.text().startsWith('{')) {
        consoleRecords.push(message.text());
      }
    });

    await page.goto('/auth?enabled-features=persistent-browser-logs&enableLogging=*');
    await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();

    expect(consoleRecords.length).toBeGreaterThan(0);
    expect(startedWorkers).toEqual([]);
    expect(await page.locator('html').getAttribute('data-unexpected-log-storage-access')).toBeNull();
  });
});

test('disables unsupported synchronous access handles without a main-thread fallback', async ({page, context}) => {
  await context.route('**/browser-log-persistence.js', async route => {
    const response = await route.fetch();
    const prefix =
      "Object.defineProperty(FileSystemFileHandle.prototype, 'createSyncAccessHandle', {value: undefined});\n";
    await route.fulfill({response, body: prefix + (await response.text())});
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {
      value(): never {
        document.documentElement.dataset.unexpectedLogStorageAccess = 'true';

        throw new Error('Main-thread filesystem fallback is forbidden');
      },
    });
  });
  let workerClosed = false;
  page.on('worker', worker => {
    worker.on('close', () => {
      workerClosed = true;
    });
  });
  const consoleRecords: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('{')) {
      consoleRecords.push(message.text());
    }
  });
  await page.goto('/auth?enabled-features=persistent-browser-logs&enableLogging=*');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  await expect
    .poll(() => {
      return workerClosed;
    })
    .toBe(true);

  expect(consoleRecords.length).toBeGreaterThan(0);
  expect(await page.locator('html').getAttribute('data-unexpected-log-storage-access')).toBeNull();
  expect(await readBrowserLogFiles(page)).toEqual([]);
});

test('keeps console logging functional after a persistence worker crashes', async ({page, context}) => {
  await context.route('**/browser-log-persistence.js', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: "throw new Error('Simulated persistence worker crash');\n" + (await response.text()),
    });
  });
  let workerClosed = false;
  page.on('worker', worker => {
    worker.on('close', () => {
      workerClosed = true;
    });
  });
  const consoleRecords: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('{')) {
      consoleRecords.push(message.text());
    }
  });
  page.on('pageerror', error => {
    uncaughtErrors.push(error.message);
  });
  await page.goto('/auth?enabled-features=persistent-browser-logs&enableLogging=*');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  await expect
    .poll(() => {
      return workerClosed;
    })
    .toBe(true);

  expect(consoleRecords.length).toBeGreaterThan(0);
  expect(uncaughtErrors).toEqual([]);
});
