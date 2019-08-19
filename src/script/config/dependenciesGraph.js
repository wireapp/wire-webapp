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

import {AssetService} from '../assets/AssetService';
import {AssetUploader} from '../assets/AssetUploader';
import {AudioRepository} from '../audio/AudioRepository';
import {AuthRepository} from '../auth/AuthRepository';
import {AuthService} from '../auth/AuthService';
import {BackendClient} from '../service/BackendClient';
import {BackupService} from '../backup/BackupService';
import {BroadcastService} from '../broadcast/BroadcastService';
import {GiphyRepository} from '../extension/GiphyRepository';
import {GiphyService} from '../extension/GiphyService';
import {LinkPreviewRepository} from '../links/LinkPreviewRepository';
import {MediaRepository} from '../media/MediaRepository';
import {MessageSender} from '../message/MessageSender';
import {PermissionRepository} from '../permission/PermissionRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {RichProfileRepository} from '../user/RichProfileRepository';
import {SelfService} from '../self/SelfService';
import {StorageService} from '../storage/StorageService';
import {UserService} from '../user/UserService';

/**
 * Dependencies is a Map that will contain all the dependencies of the app
 * The keys of the map are the classes of services the app needs and the value are the name of the service and its dependencies
 */
const dependencies = new WeakMap();

dependencies.set(AssetService, {dependencies: [BackendClient], name: 'AssetService'});
dependencies.set(AssetUploader, {dependencies: [AssetService], name: 'AssetUploader'});
dependencies.set(AudioRepository, {dependencies: [], name: 'AudioRepository'});
dependencies.set(AuthRepository, {dependencies: [AuthService], name: 'AuthRepository'});
dependencies.set(AuthService, {dependencies: [BackendClient], name: 'AuthService'});
dependencies.set(BackendClient, {dependencies: [], name: 'BackendClient'});
dependencies.set(BackupService, {dependencies: [StorageService], name: 'BackupService'});
dependencies.set(BroadcastService, {dependencies: [BackendClient], name: 'BroadcastService'});
dependencies.set(GiphyRepository, {dependencies: [GiphyService], name: 'GiphyRepository'});
dependencies.set(GiphyService, {dependencies: [BackendClient], name: 'GiphyService'});
dependencies.set(LinkPreviewRepository, {
  dependencies: [AssetService, PropertiesRepository],
  name: 'LinkPreviewRepository',
});
dependencies.set(MediaRepository, {dependencies: [PermissionRepository], name: 'MediaRepository'});
dependencies.set(MessageSender, {dependencies: [], name: 'MessageSender'});
dependencies.set(PermissionRepository, {dependencies: [], name: 'PermissionRepository'});
dependencies.set(PropertiesRepository, {dependencies: [PropertiesService, SelfService], name: 'PropertiesRepository'});
dependencies.set(PropertiesService, {dependencies: [BackendClient], name: 'PropertiesService'});
dependencies.set(RichProfileRepository, {dependencies: [BackendClient], name: 'RichProfileRepository'});
dependencies.set(SelfService, {dependencies: [BackendClient], name: 'SelfService'});
dependencies.set(StorageService, {dependencies: [], name: 'StorageService'});
dependencies.set(UserService, {dependencies: [BackendClient, StorageService], name: 'UserService'});

export {
  dependencies,
  AssetService,
  AssetUploader,
  AudioRepository,
  AuthRepository,
  BackendClient,
  BackupService,
  BroadcastService,
  GiphyRepository,
  GiphyService,
  LinkPreviewRepository,
  MediaRepository,
  MessageSender,
  RichProfileRepository,
  PermissionRepository,
  PropertiesRepository,
  PropertiesService,
  SelfService,
  StorageService,
  UserService,
};
