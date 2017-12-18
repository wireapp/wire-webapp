/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

describe('z.ViewModel.content.PreferencesDeviceDetailsViewModel', () => {
  let viewModel = undefined;
  const testFactory = new TestFactory();

  beforeEach(done => {
    testFactory
      .exposeConversationActors()
      .then(() => {
        viewModel = new z.ViewModel.content.PreferencesDeviceDetailsViewModel(
          'preferences-devices',
          TestFactory.client_repository,
          TestFactory.conversation_repository,
          TestFactory.cryptography_repository
        );
        done();
      })
      .catch(done.fail);
  });

  describe('_sanitize_external_input', () => {
    describe('always puts the time at the second position', () => {
      it('puts the time at the second position when the time comes first', () => {
        const turkish = '{{date}} ’da aktif edildi';
        const time = '22:42';
        const result = viewModel._sanitize_external_input(time, turkish);
        expect(result[1]).toBe(time);
      });

      it('puts the time at the second position when the time comes last', () => {
        const greek = 'Ενεργοποιήθηκε στις {{date}}';
        const time = '22:42';
        const result = viewModel._sanitize_external_input(time, greek);
        expect(result[1]).toBe(time);
      });

      it('puts the time at the second position when the time comes in the center', () => {
        const finish = 'Aktivoitu {{date}}: ssa';
        const time = '22:42';
        const result = viewModel._sanitize_external_input(time, finish);
        expect(result[1]).toBe(time);
      });

      it('works with a default time', () => {
        const english = 'Activated on {{date}}';
        const time = '?';
        const result = viewModel._sanitize_external_input(time, english);
        expect(result[1]).toBe(time);
      });
    });
  });
});
