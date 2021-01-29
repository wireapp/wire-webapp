/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {app, BrowserWindow} from 'electron';
import serve from 'electron-serve';

const args = process.argv;
const webappDir = './static-webapp';
const loadURL = serve({directory: webappDir, isCorsEnabled: false});

async function createWindow() {
  const mainWindow = new BrowserWindow({
    height: 600,
    webPreferences: {
      contextIsolation: true,
      webSecurity: false,
    },
    width: 800,
  });

  await loadURL(mainWindow);

  if (args.includes('--devtools')) {
    mainWindow.webContents.openDevTools({mode: 'detach'});
  }
}

void (async () => {
  await app.whenReady();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
})();
