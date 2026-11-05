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

import {HttpClient} from '../http';
import {ClientAPI} from './ClientAPI';

describe('client capability updates before WebSocket connection', () => {
  it('disables retries and propagates a failed update so connection setup can recover', async () => {
    const updateFailure = new Error('Client capability update failed');
    const sendJSON = jest.fn().mockRejectedValue(updateFailure);
    const clientApi = new ClientAPI({sendJSON} as unknown as HttpClient);

    await expect(clientApi.putClient('test-client', {capabilities: []})).rejects.toBe(updateFailure);
    expect(sendJSON).toHaveBeenCalledTimes(1);
    expect(sendJSON).toHaveBeenCalledWith({
      data: {capabilities: []},
      method: 'put',
      url: '/clients/test-client',
      'axios-retry': {retries: 0},
    });
  });
});
