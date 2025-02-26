/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {singleton} from 'tsyringe';

import {APIClient as APIClientUnconfigured} from '@wireapp/api-client';

import {Config} from '../Config';

@singleton()
export class APIClient extends APIClientUnconfigured {
  constructor() {
    const config = Config.getConfig();

    super({
      urls: {
        name: config.ENVIRONMENT,
        rest: config.BACKEND_REST,
        ws: config.BACKEND_WS,
      },
      cells: {
        pydio: {
          apiKey: config.CELLS_PYDIO_API_KEY,
          segment: config.CELLS_PYDIO_SEGMENT,
          url: config.CELLS_PYDIO_URL,
        },
        s3: {
          apiKey: config.CELLS_S3_API_KEY,
          bucket: config.CELLS_S3_BUCKET,
          endpoint: config.CELLS_S3_ENDPOINT,
          region: config.CELLS_S3_REGION,
        },
      },
    });
  }
}
