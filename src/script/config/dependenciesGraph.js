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

import {AuthRepository} from '../auth/AuthRepository';
import {AuthService} from '../auth/AuthService';
import {BackendClient} from '../service/BackendClient';
import {GiphyRepository} from '../extension/GiphyRepository';
import {GiphyService} from '../extension/GiphyService';
import {RichProfileRepository} from '../user/RichProfileRepository';

/**
 * Dependencies is a Map that will contain all the dependencies of the app
 * The keys of the map are the classes of services the app needs and the value are the name of the service and its dependencies
 */
const dependencies = new WeakMap();

dependencies.set(AuthRepository, {dependencies: [AuthService], name: 'AuthRepository'});
dependencies.set(AuthService, {dependencies: [BackendClient], name: 'AuthService'});
dependencies.set(BackendClient, {dependencies: [], name: 'BackendClient'});
dependencies.set(GiphyRepository, {dependencies: [GiphyService], name: 'GiphyRepository'});
dependencies.set(GiphyService, {dependencies: [BackendClient], name: 'GiphyService'});
dependencies.set(RichProfileRepository, {dependencies: [BackendClient], name: 'RichProfileRepository'});

export {dependencies, AuthRepository, BackendClient, GiphyRepository, GiphyService, RichProfileRepository};
