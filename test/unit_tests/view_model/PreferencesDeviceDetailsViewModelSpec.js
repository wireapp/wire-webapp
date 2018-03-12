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

'use strict';

// grunt test_init && grunt test_run:view_model/PreferencesDeviceDetailsViewModel

describe('z.viewModel.content.PreferencesDeviceDetailsViewModel', () => {
  const testFactory = new TestFactory();
  let viewModel;

  beforeEach(done => {
    testFactory
      .exposeConversationActors()
      .then(() => {
        viewModel = new z.viewModel.content.PreferencesDeviceDetailsViewModel({}, undefined, {
          client: TestFactory.client_repository,
          conversation: TestFactory.conversation_repository,
          cryptography: TestFactory.cryptography_repository,
        });
        done();
      })
      .catch(done.fail);
  });

  describe('_updateActivationLocation', () => {
    it('keeps the location as a pivot element', () => {
      const location = 'Paris, FR';
      viewModel._updateActivationLocation(location);
      const sanitizedText = viewModel.activationLocation();
      expect(sanitizedText[1].text).toBe(location);
    });
  });
});
