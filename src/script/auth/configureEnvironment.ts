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

const jQuery = require('jquery');
import {amplify} from 'amplify';
import * as bazinga64 from 'bazinga64';
import * as platform from 'platform';
import '../config';
import '../event/Client';
import '../event/WebApp';
import '../message/MessageCategorization';
import '../message/MessageCategory';
import '../service/BackendEnvironment';
import '../storage/StorageSchemata';
// Adding "window.z.util.Environment" which is required by "wire-desktop"
import '../util/Environment';
import '../util/URLUtil';
import '../util/util';

declare global {
  interface Window {
    $: any;
    amplify: amplify.Static;
    bazinga64: any;
    jQuery: any;
    platform: any;
    z: any;
  }
  // https://github.com/Microsoft/TypeScript/issues/26728
  interface Navigator {
    // Only available in a secure context.
    readonly clipboard?: {
      writeText(text: string): Promise<void>;
      readText(): Promise<string>;
    };
  }
}

window.amplify = amplify;
window.bazinga64 = bazinga64;
window.platform = platform;
window.jQuery = jQuery;
window.$ = jQuery;

const configureEnvironment = () => {};

export {configureEnvironment};
