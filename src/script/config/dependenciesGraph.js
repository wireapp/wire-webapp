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
import AudioRepository from '../audio/AudioRepository';
import CacheRepository from '../cache/CacheRepository';
import BackendClient from '../service/BackendClient';
import GiphyService from '../extension/GiphyService';
import GiphyRepository from '../extension/GiphyRepository';
import PropertiesService from '../properties/PropertiesService';

/** Dependencies is a Map that will contain all the dependencies of the app
 * The keys of the map are the identifiers of the app's classes and the values are an array of classes that need to be instanciated
 */
const dependencies = new Map();

dependencies.set(CacheRepository.identifier, []);
dependencies.set(AudioRepository.identifier, []);
dependencies.set(BackendClient.identifier, []);
dependencies.set(GiphyService.identifier, [BackendClient]);
dependencies.set(GiphyRepository.identifier, [GiphyService]);
dependencies.set(AssetService.identifier, [BackendClient]);
dependencies.set(PropertiesService.identifier, [BackendClient]);

export default dependencies;
