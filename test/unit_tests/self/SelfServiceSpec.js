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

import {resolve, graph} from '../../api/testResolver';
import {SelfService} from 'src/script/self/SelfService';

describe('SelfService', () => {
  const backendClient = resolve(graph.BackendClient);
  const selfService = new SelfService(backendClient);

  beforeEach(() => {
    spyOn(backendClient, 'sendRequest').and.returnValue(Promise.resolve());
  });

  it('deletes self user on backend', () => {
    selfService.deleteSelf('password');

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({password: 'password'}),
        type: 'DELETE',
      }),
    );
  });

  it('gets the self user from backend', () => {
    selfService.getSelf();

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'GET',
        url: graph.SelfService.URL.SELF,
      }),
    );
  });

  it('gets the self consent from backend', () => {
    selfService.getSelfConsent();

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'GET',
        url: jasmine.stringMatching(/\/consent/),
      }),
    );
  });

  it('updates the user against backend', () => {
    const updates = {};
    selfService.putSelf(updates);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify(updates),
        type: 'PUT',
        url: graph.SelfService.URL.SELF,
      }),
    );
  });

  it("updates user's consent against backend", () => {
    const params = {source: 'webapp', type: 0, value: 1};
    selfService.putSelfConsent(params.type, params.value, params.source);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify(params),
        type: 'PUT',
        url: jasmine.stringMatching(/\/consent/),
      }),
    );
  });

  it("updates user's email against backend", () => {
    const newEmail = 'new@wire.com';
    selfService.putSelfEmail(newEmail);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({email: newEmail}),
        type: 'PUT',
        url: jasmine.stringMatching(/\/email/),
      }),
    );
  });

  it("updates user's handle against backend", () => {
    const newHandle = 'felix';
    selfService.putSelfHandle(newHandle);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({handle: newHandle}),
        type: 'PUT',
        url: jasmine.stringMatching(/\/handle/),
      }),
    );
  });

  it("updates user's locale against backend", () => {
    const newLocale = 'fr';
    selfService.putSelfLocale(newLocale);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({locale: newLocale}),
        type: 'PUT',
        url: jasmine.stringMatching(/\/locale/),
      }),
    );
  });

  it("updates user's password against backend", () => {
    const newPassword = 'newpass';
    const oldPassword = 'oldPass';
    selfService.putSelfPassword(newPassword, oldPassword);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({new_password: newPassword, old_password: oldPassword}),
        type: 'PUT',
        url: jasmine.stringMatching(/\/password/),
      }),
    );
  });

  it("updates user's phone number against backend", () => {
    const newPhone = '+33032945932';
    selfService.putSelfPhone(newPhone);

    expect(backendClient.sendRequest).toHaveBeenCalledWith(
      jasmine.objectContaining({
        data: JSON.stringify({phone: newPhone}),
        type: 'PUT',
        url: jasmine.stringMatching(/\/phone/),
      }),
    );
  });
});
