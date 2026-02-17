/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {HandledEventPayload} from '../notification';

export type EventHandlerResult = Promise<HandledEventPayload | void>;

export interface CoreCryptoConfig {
  /**
   * path on the public server to the core crypto wasm file.
   * This file will be downloaded lazily when corecrypto is needed.
   * It, thus, needs to know where, on the server, the file can be found
   */
  wasmFilePath: string;
  enabled: boolean;
}
