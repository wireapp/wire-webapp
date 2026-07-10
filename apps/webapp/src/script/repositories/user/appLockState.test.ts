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

import {FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';
import {container} from 'tsyringe';
import ko from 'knockout';

import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {AppLockState} from './appLockState';

describe('AppLockState', () => {
  let appLockState: AppLockState;
  let teamState: TeamState;
  let configSpy: jest.SpyInstance;
  let desktopConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    teamState = container.resolve(TeamState);
    appLockState = new AppLockState(teamState);
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      FEATURE: {
        ENABLE_MDM_CONFIG: false,
      },
    });
    desktopConfigSpy = jest.spyOn(Config, 'getDesktopConfig').mockReturnValue(undefined);
  });

  afterEach(() => {
    configSpy.mockRestore();
    desktopConfigSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('isAppLockEnabled', () => {
    describe('when MDM config is disabled', () => {
      beforeEach(() => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: false,
          },
        });
      });

      it('should return false when app lock is not enforced and not activated in preferences', () => {
        expect(appLockState.isAppLockEnabled()).toBe(false);
      });

      it('should return true when app lock is activated in preferences', () => {
        appLockState.isActivatedInPreferences(true);

        expect(appLockState.isAppLockEnabled()).toBe(true);
      });
    });

    describe('when MDM config is enabled', () => {
      beforeEach(() => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
      });

      describe('and MDM override is enabled', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
            managedConfig: {
              applockOverride: true,
            },
          });
          // Mock teamState for this group
          jest.spyOn(teamState, 'isTeam').mockReturnValue(true);
          jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
            appLock: {
              status: FEATURE_STATUS.ENABLED,
              config: {
                enforceAppLock: false,
              },
            },
          });
        });

        it('should force app lock to be disabled regardless of preferences', () => {
          appLockState.isActivatedInPreferences(true);

          expect(appLockState.isAppLockEnabled()).toBe(false);
        });

        it('should disable app lock even when enforced by team', () => {
          // Override enforceAppLock for this specific test
          jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
            appLock: {
              status: FEATURE_STATUS.ENABLED,
              config: {
                enforceAppLock: true,
              },
            },
          });

          expect(appLockState.isAppLockEnabled()).toBe(false);
        });
      });

      describe('and MDM override is disabled', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
            managedConfig: {
              applockOverride: false,
            },
          });
          // Ensure teamState is properly mocked
          jest.spyOn(teamState, 'isTeam').mockReturnValue(false);
          jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
            appLock: {
              status: FEATURE_STATUS.DISABLED,
              config: {},
            },
          });
        });

        it('should allow app lock to be controlled by preferences', () => {
          appLockState.isActivatedInPreferences(true);

          expect(appLockState.isAppLockEnabled()).toBe(true);
        });

        it('should return false when not activated in preferences', () => {
          appLockState.isActivatedInPreferences(false);

          expect(appLockState.isAppLockEnabled()).toBe(false);
        });
      });

      describe('and managedConfig is missing', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
          }); // Ensure teamState is properly mocked
          jest.spyOn(teamState, 'isTeam').mockReturnValue(false);
          jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
            appLock: {
              status: FEATURE_STATUS.DISABLED,
              config: {},
            },
          });
        });

        it('should allow app lock to be controlled by preferences', () => {
          appLockState.isActivatedInPreferences(true);

          expect(appLockState.isAppLockEnabled()).toBe(true);
        });
      });

      describe('and desktopConfig is missing entirely', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue(undefined);
          // Ensure teamState is properly mocked
          jest.spyOn(teamState, 'isTeam').mockReturnValue(false);
          jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
            appLock: {
              status: FEATURE_STATUS.DISABLED,
              config: {},
            },
          });
        });

        it('should allow app lock to be controlled by preferences', () => {
          appLockState.isActivatedInPreferences(true);

          expect(appLockState.isAppLockEnabled()).toBe(true);
        });
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        // Ensure teamState is properly mocked for all edge case tests
        jest.spyOn(teamState, 'isTeam').mockReturnValue(false);
        jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
          appLock: {
            status: FEATURE_STATUS.DISABLED,
            config: {},
          },
        });
      });

      it('should handle applockOverride as non-boolean value safely', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: 1, // Invalid: number instead of boolean
          },
        });

        appLockState.isActivatedInPreferences(true);

        // Should still work with strict comparison
        expect(appLockState.isAppLockEnabled()).toBe(true);
      });

      it('should handle stale desktop config gracefully', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
        // Old config format without managedConfig
        desktopConfigSpy.mockReturnValue({
          version: '0.5',
          supportsCallingPopoutWindow: true,
        });

        appLockState.isActivatedInPreferences(true);

        expect(appLockState.isAppLockEnabled()).toBe(true);
      });

      it('should handle applockOverride with undefined value', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: undefined,
          },
        });

        appLockState.isActivatedInPreferences(true);

        expect(appLockState.isAppLockEnabled()).toBe(true);
      });

      it('should handle applockOverride with null value', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: null,
          },
        });

        appLockState.isActivatedInPreferences(true);

        expect(appLockState.isAppLockEnabled()).toBe(true);
      });
    });

    describe('isAppLockActivated', () => {
      beforeEach(() => {
        // Ensure teamState is properly mocked
        jest.spyOn(teamState, 'isTeam').mockReturnValue(false);
        jest.spyOn(teamState, 'teamFeatures').mockReturnValue({
          appLock: {
            status: FEATURE_STATUS.DISABLED,
            config: {},
          },
        });
      });

      it('should return true when app lock is enabled and passphrase is set', () => {
        appLockState.isActivatedInPreferences(true);
        appLockState.hasPassphrase(true);

        expect(appLockState.isAppLockActivated()).toBe(true);
      });

      it('should return false when app lock is disabled even if passphrase is set', () => {
        appLockState.hasPassphrase(true);

        expect(appLockState.isAppLockActivated()).toBe(false);
      });

      it('should return false when MDM overrides app lock even with passphrase', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        });
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: true,
          },
        });
        appLockState.isActivatedInPreferences(true);
        appLockState.hasPassphrase(true);

        expect(appLockState.isAppLockActivated()).toBe(false);
      });
    });
  });
});
