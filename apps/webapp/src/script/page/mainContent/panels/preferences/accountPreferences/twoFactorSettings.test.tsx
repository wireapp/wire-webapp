/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {Clock} from '@enormora/clock/clock';
import {task} from 'true-myth';
import {noop} from 'noop-esm';

import {ThemeProvider} from '@wireapp/react-ui-kit';

import {TwoFactorLoginPreview} from 'Components/twoFactor/twoFactorLoginPreview';
import {RecoveryCodeReminder} from 'Components/twoFactor/recoveryCodeReminder';
import {TwoFactorReminder} from 'Components/twoFactor/twoFactorReminder';
import {PostLoginTwoFactorSetup} from 'Components/twoFactor/postLoginTwoFactorSetup';
import type {TwoFactorApi} from 'Components/twoFactor/twoFactorApi';
import en from 'I18n/en-US.json';
import {setLocale, setStrings, translate} from 'Util/localizerUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {TwoFactorSettings} from './twoFactorSettings';

const credential = {
  id: 'credential-1',
  name: 'Phone',
  created_at: '2026-11-03T10:00:00.000Z',
  activated_at: '2026-11-03T10:01:00.000Z',
};
const enrolment = {
  credential_id: 'credential-2',
  secret: 'JBSWY3DPEHPK3PXP',
  uri: 'otpauth://totp/Wire:test%40wire.com?secret=JBSWY3DPEHPK3PXP&issuer=Wire',
  algorithm: 'sha1' as const,
  digits: 6,
  period: 30,
  server_time: '2026-11-03T10:00:00.000Z',
  expires_at: '2026-11-03T10:10:00.000Z',
};
const codes = Array.from({length: 10}, (_, i) => {
  return `3MK7-9WQX-0V2H-8TZ${i}`;
});
const makeApi = () => {
  return {
    list: jest.fn().mockImplementation(() => {
      return task.resolve([]);
    }),
    enrol: jest.fn().mockImplementation(() => {
      return task.resolve(enrolment);
    }),
    activate: jest.fn().mockImplementation(() => {
      return task.resolve({codes});
    }),
    rename: jest.fn().mockImplementation(() => {
      return task.resolve(undefined);
    }),
    remove: jest.fn().mockImplementation(() => {
      return task.resolve(undefined);
    }),
  };
};
const wrapper = (clock: Clock) => {
  return createRootProviderWrapperForTest(createRootContextValueForTest({translate, clock}));
};
const renderSettings = (
  api: TwoFactorApi,
  enforced = false,
  clock: Clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
) => {
  return render(
    <ThemeProvider>
      <TwoFactorSettings email="test@wire.com" api={api} enforced={enforced} />
    </ThemeProvider>,
    {wrapper: wrapper(clock)},
  );
};
const pasteCode = (code: string) => {
  const inputs = within(screen.getByRole('group', {name: 'Authentication code'})).getAllByRole('textbox');
  fireEvent.paste(inputs[0], {
    clipboardData: {
      getData: () => {
        return code;
      },
    },
  });
};
const startSetup = async () => {
  fireEvent.click(await screen.findByRole('button', {name: 'Set up'}));
  fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'password'}});
  fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
  await screen.findByText('Scan the QR code');
};

describe('TOTP settings and enrollment', () => {
  beforeAll(() => {
    setLocale('en');
    setStrings({en});
  });

  describe('TwoFactorSettings', () => {
    it('enrols with the password, activates the returned credential, and requires saving the returned codes', async () => {
      const api = makeApi();
      renderSettings(api);
      await startSetup();
      expect(api.enrol).toHaveBeenCalledWith('Authenticator app', {password: 'password'});
      fireEvent.click(screen.getByRole('link', {name: 'Can’t scan it? Enter the setup key'}));
      expect(screen.getByText(enrolment.secret)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
      fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'Work phone'}});
      pasteCode('014921');
      fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
      await screen.findByText('Save your recovery codes');
      expect(api.rename).toHaveBeenCalledWith(enrolment.credential_id, 'Work phone');
      expect(api.activate).toHaveBeenCalledWith(enrolment.credential_id, '014921');
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
      expect(screen.getByRole('button', {name: 'Finish setup'})).toBeDisabled();
      expect(screen.queryByRole('button', {name: 'Close'})).not.toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
      expect(screen.getByText(codes[0])).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('I have saved my recovery codes'));
      fireEvent.click(screen.getByRole('button', {name: 'Finish setup'}));
      expect(screen.getByText('On')).toBeInTheDocument();
      expect(screen.queryByText(codes[0])).not.toBeInTheDocument();
    });

    it('copies the real setup key and restores the link after 1.5 seconds', async () => {
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
      renderSettings(makeApi(), false, clock);
      await startSetup();
      fireEvent.click(screen.getByRole('link', {name: 'Can’t scan it? Enter the setup key'}));
      fireEvent.click(screen.getByRole('link', {name: 'Copy key'}));
      expect(await screen.findByRole('status')).toHaveTextContent('Key copied');
      expect(writeText).toHaveBeenCalledWith(enrolment.secret);
      act(() => {
        return clock.advanceByMilliseconds(1500);
      });
      expect(screen.getByRole('link', {name: 'Copy key'})).toBeInTheDocument();
    });

    it('does not expose a secret when password confirmation fails', async () => {
      const api = makeApi();
      api.enrol.mockImplementation(() => {
        return task.reject('invalid-credentials');
      });
      renderSettings(api);
      fireEvent.click(await screen.findByRole('button', {name: 'Set up'}));
      fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'wrong'}});
      fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
      expect(await screen.findByRole('alert')).toHaveTextContent('That password didn’t work.');
      expect(screen.queryByText('Scan the QR code')).not.toBeInTheDocument();
    });

    it.each(['totp-invalid-code', 'totp-enrolment-expired'])(
      'handles activation failure %s without enabling 2FA',
      async label => {
        const api = makeApi();
        api.activate.mockImplementation(() => {
          return task.reject(label);
        });
        renderSettings(api);
        await startSetup();
        fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
        pasteCode('123456');
        fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
        await screen.findByRole('alert');
        expect(screen.getByText('Off')).toBeInTheDocument();
        expect(screen.queryByText(codes[0])).not.toBeInTheDocument();
        if (label === 'totp-enrolment-expired') {
          fireEvent.click(screen.getByRole('button', {name: 'Start again'}));
          expect(screen.getByLabelText('Password')).toHaveValue('');
        }
      },
    );

    it('does not count pending credentials as enabled', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.resolve([{...credential, activated_at: null}]);
      });
      renderSettings(api);
      expect(await screen.findByText('Off')).toBeInTheDocument();
    });

    it('does not claim 2FA is off when status loading fails', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.reject('unknown');
      });
      renderSettings(api);
      await screen.findByRole('alert');
      expect(screen.queryByText('Off')).not.toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Try again'})).toBeInTheDocument();
    });

    it('hides turn off when enforced and never re-displays old recovery codes', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.resolve([credential]);
      });
      renderSettings(api, true);
      await screen.findByText('Required');
      expect(screen.queryByRole('button', {name: 'Turn off'})).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', {name: 'Generate'}));
      expect(screen.getByText(/Preview only:/)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'password'}});
      fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
      const dialog = within(screen.getByRole('dialog'));
      fireEvent.click(dialog.getByRole('button', {name: 'Generate'}));
      expect(dialog.getAllByRole('listitem')).toHaveLength(10);
      expect(dialog.getByRole('button', {name: 'Done'})).toBeDisabled();
      fireEvent.click(screen.getByLabelText('I have saved my recovery codes'));
      fireEvent.click(dialog.getByRole('button', {name: 'Done'}));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.activate).not.toHaveBeenCalled();
    });

    it('disables using the credential id and prefixed TOTP only after a successful response', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.resolve([credential]);
      });
      api.remove.mockImplementationOnce(() => {
        return task.reject('totp-invalid-code');
      });
      renderSettings(api);
      fireEvent.click(await screen.findByRole('button', {name: 'Turn off'}));
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByRole('button', {name: 'Turn off'})).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'password'}});
      pasteCode('014921');
      fireEvent.click(dialog.getByRole('button', {name: 'Turn off'}));
      await screen.findByRole('alert');
      expect(screen.getByText('On')).toBeInTheDocument();
      fireEvent.click(dialog.getByRole('button', {name: 'Turn off'}));
      expect(await screen.findByText('Off')).toBeInTheDocument();
      expect(api.remove).toHaveBeenCalledWith(credential.id, {password: 'password', totp_code: 'totp:014921'});
    });

    it('does not activate when saving the authenticator name fails', async () => {
      const api = makeApi();
      api.rename.mockImplementation(() => {
        return task.reject('unknown');
      });
      renderSettings(api);
      await startSetup();
      fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
      fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'Work phone'}});
      pasteCode('014921');
      fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
      await screen.findByRole('alert');
      expect(api.activate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Name')).toHaveValue('Work phone');
    });

    it('renames an app without enrolling or replacing its secret', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.resolve([credential]);
      });
      renderSettings(api);
      fireEvent.click(await screen.findByRole('button', {name: 'Manage'}));
      expect(screen.getByText(/^Added /)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
      fireEvent.change(screen.getByLabelText('Name'), {target: {value: 'Work phone'}});
      fireEvent.click(screen.getByRole('button', {name: 'Save'}));
      expect(await screen.findByText('Work phone')).toBeInTheDocument();
      expect(api.rename).toHaveBeenCalledWith(credential.id, 'Work phone');
      expect(api.enrol).not.toHaveBeenCalled();
    });
  });

  describe('conversation reminders', () => {
    it('shows the recovery-code count without an action button', () => {
      render(
        <ThemeProvider>
          <RecoveryCodeReminder codesLeft={9} />
        </ThemeProvider>,
        {
          wrapper: wrapper(createDeterministicClock({initialUnixEpochMicroseconds: 0n})),
        },
      );
      expect(screen.getByText('You logged in with a recovery code. 9 codes left.')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it.each([true, false])('shows role-specific copy and working actions (admin: %s)', isAdmin => {
      const onDismiss = jest.fn();
      const onSetup = jest.fn();
      render(
        <ThemeProvider>
          <TwoFactorReminder
            isAdmin={isAdmin}
            daysLeft={45}
            deadline="2026-12-06"
            onDismiss={onDismiss}
            onSetup={onSetup}
          />
        </ThemeProvider>,
        {
          wrapper: wrapper(createDeterministicClock({initialUnixEpochMicroseconds: 0n})),
        },
      );
      expect(screen.getByText(isAdmin ? /Owners and admins need/ : /Your team requires/)).toHaveTextContent(
        '45 days left',
      );
      fireEvent.click(screen.getByRole('button', {name: 'Set up now'}));
      expect(onSetup).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', {name: 'Dismiss'}));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('authenticator login preview', () => {
    it('requires six digits and clears the code when switching authenticator apps', () => {
      const onContinue = jest.fn();
      render(
        <ThemeProvider>
          <TwoFactorLoginPreview onContinue={onContinue} />
        </ThemeProvider>,
        {
          wrapper: wrapper(createDeterministicClock({initialUnixEpochMicroseconds: 0n})),
        },
      );
      expect(screen.getByText(/UI preview:/)).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Verify'})).toBeDisabled();
      pasteCode('123');
      expect(screen.getByRole('button', {name: 'Verify'})).toBeDisabled();
      fireEvent.click(screen.getByRole('link', {name: 'Use another authenticator app'}));
      fireEvent.click(screen.getByRole('button', {name: 'Authenticator App 2'}));
      expect(screen.getByText(/Open Authenticator App 2/)).toBeInTheDocument();
      expect(
        screen.getAllByRole('textbox').every(input => {
          return (input as HTMLInputElement).value === '';
        }),
      ).toBe(true);
      expect(onContinue).not.toHaveBeenCalled();
      pasteCode('012345');
      fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('setup after login', () => {
    const renderLogin = (api: TwoFactorApi, onContinue: () => void) => {
      return render(
        <ThemeProvider>
          <PostLoginTwoFactorSetup
            email="test@wire.com"
            password="password"
            onCredentialsConsumed={noop}
            onContinue={onContinue}
            api={api}
          />
        </ThemeProvider>,
        {wrapper: wrapper(createDeterministicClock({initialUnixEpochMicroseconds: 0n}))},
      );
    };

    it('shows the fixed setup period and lets the user continue without changing credentials', () => {
      const api = makeApi();
      const onContinue = jest.fn();
      renderLogin(api, onContinue);
      expect(screen.getByText('45 days left')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', {name: 'Remind me later'}));
      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(api.enrol).not.toHaveBeenCalled();
    });

    it('uses the login password and resumes only after recovery codes are saved', async () => {
      const api = makeApi();
      const onContinue = jest.fn();
      renderLogin(api, onContinue);
      fireEvent.click(screen.getByRole('button', {name: 'Set up now'}));
      await screen.findByText('Scan the QR code');
      expect(api.enrol).toHaveBeenCalledWith('Authenticator app', {password: 'password'});
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
      pasteCode('014921');
      fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
      const finish = await screen.findByRole('button', {name: 'Finish setup'});
      expect(finish).toBeDisabled();
      expect(onContinue).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', {name: 'Remind me later'})).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('I have saved my recovery codes'));
      fireEvent.click(finish);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('does not enrol again when an authenticator is already active', async () => {
      const api = makeApi();
      api.list.mockImplementation(() => {
        return task.resolve([credential]);
      });
      const onContinue = jest.fn();
      renderLogin(api, onContinue);
      fireEvent.click(screen.getByRole('button', {name: 'Set up now'}));
      await waitFor(() => {
        return expect(onContinue).toHaveBeenCalledTimes(1);
      });
      expect(api.enrol).not.toHaveBeenCalled();
    });
  });
});
