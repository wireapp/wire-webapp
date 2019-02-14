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
 *
 */

import AssetService from '../assets/AssetService';
import AssetUploader from '../assets/AssetUploader';
import AudioRepository from '../audio/AudioRepository';
import CacheRepository from '../cache/CacheRepository';
import BackendClient from '../service/BackendClient';
import BackupService from '../backup/BackupService';
import GiphyService from '../extension/GiphyService';
import GiphyRepository from '../extension/GiphyRepository';
import MediaRepository from '../media/MediaRepository';
import PermissionRepository from '../permission/PermissionRepository';
import PropertiesService from '../properties/PropertiesService';
import PropertiesRepository from '../properties/PropertiesRepository';
import StorageService from '../storage/StorageService';
import SelfService from '../self/SelfService';
import UserService from '../user/UserService';

/** Dependencies is a Map that will contain all the dependencies of the app
 * The keys of the map are the classes of services the app needs and the value are the name of the service and its dependencies
 */
const dependencies = new WeakMap();

dependencies.set(CacheRepository, {dependencies: [], name: 'CacheRepository'});
dependencies.set(AudioRepository, {dependencies: [], name: 'AudioRepository'});
dependencies.set(BackendClient, {dependencies: [], name: 'BackendClient'});
dependencies.set(GiphyService, {dependencies: [BackendClient], name: 'GiphyService'});
dependencies.set(GiphyRepository, {dependencies: [GiphyService], name: 'GiphyRepository'});
dependencies.set(AssetService, {dependencies: [BackendClient], name: 'AssetService'});
dependencies.set(AssetUploader, {dependencies: [AssetService], name: 'AssetUploader'});
dependencies.set(MediaRepository, {dependencies: [PermissionRepository], name: 'MediaRepository'});
dependencies.set(PropertiesService, {dependencies: [BackendClient], name: 'PropertiesService'});
dependencies.set(PropertiesRepository, {dependencies: [PropertiesService, SelfService], name: 'PropertiesRepository'});
dependencies.set(PermissionRepository, {dependencies: [], name: 'PermissionRepository'});
dependencies.set(StorageService, {dependencies: [], name: 'StorageService'});
dependencies.set(SelfService, {dependencies: [BackendClient], name: 'SelfService'});
dependencies.set(BackupService, {dependencies: [StorageService], name: 'BackupService'});
dependencies.set(UserService, {dependencies: [BackendClient, StorageService], name: 'UserService'});

export {
  dependencies,
  CacheRepository,
  AudioRepository,
  BackendClient,
  GiphyService,
  GiphyRepository,
  AssetService,
  AssetUploader,
  MediaRepository,
  PropertiesService,
  PropertiesRepository,
  PermissionRepository,
  StorageService,
  SelfService,
  BackupService,
  UserService,
};
