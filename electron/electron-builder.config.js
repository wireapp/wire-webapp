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

// @ts-check

const artifactName = '${productName}-${version}.${ext}';
const portableArtifactName = '${productName}-${version}-portable.${ext}';
const productName = process.env.TAG === 'production' ? 'Wire' : 'WireInternal';
const schema = 'wire';
const macBundleId = 'com.wearezeta.zclient.macdev';

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.squirrel.wire.dev',
  artifactName,
  asar: true,
  buildVersion: '1234',
  copyright: '© Wire Swiss GmbH',
  directories: {
    buildResources: 'resources',
    output: 'build',
  },
  files: ['dist/*.js', 'img/', 'static-webapp/'],
  icon: 'img/512x512.png',
  linux: {
    category: 'Network',
    desktop: {
      Categories: 'Network;InstantMessaging;Chat;VideoConference',
      GenericName: 'The most secure collaboration platform.',
      Keywords: 'chat;encrypt;e2e;messenger;videocall',
      MimeType: `x-scheme-handler/${schema}`,
      Name: productName,
      StartupWMClass: productName,
      Version: '1.1',
    },
    executableName: 'wire-desktop',
    target: ['deb'],
  },
  mac: {
    appId: macBundleId,
    category: 'public.app-category.social-networking',
    darkModeSupport: true,
    helperBundleId: `${macBundleId}.helper`,
    helperEHBundleId: `${macBundleId}.helper`,
    helperPluginBundleId: `${macBundleId}.helper`,
    helperRendererBundleId: `${macBundleId}.helper`,
    icon: 'resources/macos/logo.icns',
    target: ['dmg'],
  },
  msi: {
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    warningsAsErrors: true,
  },
  portable: {
    artifactName: portableArtifactName,
  },
  productName,
  protocols: [
    {
      name: 'Wire Core Protocol',
      schemes: [schema],
    },
  ],
  publish: null,
  removePackageScripts: true,
  win: {
    icon: 'img/logo/logo.ico',
    target: ['msi', 'portable'],
  },
};

module.exports = config;
