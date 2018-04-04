/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import jQuery from 'jquery';
import {amplify} from '@bower_components/amplify';
import bazinga64 from 'bazinga64';
import platform from 'platform';
import '../event/WebApp';

window.amplify = amplify;
window.bazinga64 = bazinga64;
window.platform = platform;
window.jQuery = jQuery;
window.$ = jQuery;

import '../config';
import '../service/BackendEnvironment';
import '../util/util';
// Adding "window.z.util.Environment" which is required by "wire-desktop"
import '../util/Environment';
import '../util/URLUtil';
import '../tracking/SuperProperty';
import '../event/Client';
import '../message/MessageCategorization';
import '../message/MessageCategory';
import '../storage/StorageSchemata';

// Expose wire object in global namespace to satisfy wrapper check
const configureEnvironment = () => (window.wire = {});

export default configureEnvironment;
