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

import {render, screen} from '@testing-library/react';

import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {AppLockRepository} from 'Repositories/user/appLockRepository';
import {AppLockState} from 'Repositories/user/appLockState';
import {Config} from 'src/script/Config';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import ko from 'knockout';

import {PrivacySection} from './privacySection';

const createMockAppLockState = (overrides?: Partial<AppLockState>): AppLockState => {
  const hasPassphrase = ko.observable(false);
  const isActivatedInPreferences = ko.observable(false);

  // Create observables for computed values that can be overridden
  const isAppLockEnforcedValue = ko.observable(overrides?.isAppLockEnforced?.() ?? false);
  const isAppLockAvailableValue = ko.observable(overrides?.isAppLockAvailable?.() ?? true);
  const isAppLockEnabledValue = ko.observable(overrides?.isAppLockEnabled?.() ?? false);
  const appLockInactivityTimeoutSecsValue = ko.observable(overrides?.appLockInactivityTimeoutSecs?.() ?? 10);
  const isAppLockDisabledOnTeamValue = ko.observable(overrides?.isAppLockDisabledOnTeam?.() ?? false);
  const isAppLockActivatedValue = ko.observable(overrides?.isAppLockActivated?.() ?? false);

  return {
    isAppLockEnabled: ko.pureComputed(() => isAppLockEnabledValue()),
    isAppLockAvailable: ko.pureComputed(() => isAppLockAvailableValue()),
    isAppLockEnforced: ko.pureComputed(() => isAppLockEnforcedValue()),
    appLockInactivityTimeoutSecs: ko.pureComputed(() => appLockInactivityTimeoutSecsValue()),
    isAppLockActivated: ko.pureComputed(() => isAppLockActivatedValue()),
    hasPassphrase,
    isActivatedInPreferences,
    isAppLockDisabledOnTeam: ko.pureComputed(() => isAppLockDisabledOnTeamValue()),
  };
};

const createMockPropertiesRepository = (): PropertiesRepository => {
  return {
    receiptMode: ko.observable(0),
    typingIndicatorMode: ko.observable(0),
  } as any;
};

const createMockAppLockRepository = (): AppLockRepository => {
  return {
    setEnabled: jest.fn(),
  } as any;
};

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('PrivacySection', () => {
  let configSpy: jest.SpyInstance;
  let desktopConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      FEATURE: {
        ENABLE_MDM_CONFIG: false,
      },
    } as any);
    desktopConfigSpy = jest.spyOn(Config, 'getDesktopConfig').mockReturnValue(undefined);
  });

  afterEach(() => {
    configSpy.mockRestore();
    desktopConfigSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('app lock checkbox', () => {
    it('should render the app lock checkbox when available', () => {
      const appLockState = createMockAppLockState({
        isAppLockAvailable: ko.pureComputed(() => true),
      });
      const propertiesRepository = createMockPropertiesRepository();
      const appLockRepository = createMockAppLockRepository();

      render(
        withTheme(
          <PrivacySection
            appLockRepository={appLockRepository}
            appLockState={appLockState}
            propertiesRepository={propertiesRepository}
          />,
        ),
        {wrapper: rootProviderWrapper},
      );

      expect(screen.getByTestId('status-preference-applock')).toBeInTheDocument();
    });

    it('should not render the app lock checkbox when not available', () => {
      const appLockState = createMockAppLockState({
        isAppLockAvailable: ko.pureComputed(() => false),
      });
      const propertiesRepository = createMockPropertiesRepository();
      const appLockRepository = createMockAppLockRepository();

      render(
        withTheme(
          <PrivacySection
            appLockRepository={appLockRepository}
            appLockState={appLockState}
            propertiesRepository={propertiesRepository}
          />,
        ),
        {wrapper: rootProviderWrapper},
      );

      expect(screen.queryByTestId('status-preference-applock')).not.toBeInTheDocument();
    });

    describe('when MDM config is enabled', () => {
      beforeEach(() => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
      });

      describe('and MDM override is enabled', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
            managedConfig: {
              applockOverride: true,
            },
          } as any);
        });

        it('should disable the app lock checkbox', () => {
          const appLockState = createMockAppLockState({
            isAppLockAvailable: ko.pureComputed(() => true),
            isAppLockEnabled: ko.pureComputed(() => true),
          });
          const propertiesRepository = createMockPropertiesRepository();
          const appLockRepository = createMockAppLockRepository();

          render(
            withTheme(
              <PrivacySection
                appLockRepository={appLockRepository}
                appLockState={appLockState}
                propertiesRepository={propertiesRepository}
              />,
            ),
            {wrapper: rootProviderWrapper},
          );

          const checkbox = screen.getByRole('checkbox', {name: /applock/i});
          expect(checkbox).toBeDisabled();
        });

        it('should uncheck the app lock checkbox when MDM override is active', () => {
          const appLockState = createMockAppLockState({
            isAppLockAvailable: ko.pureComputed(() => true),
            isAppLockEnabled: ko.pureComputed(() => false),
          });
          const propertiesRepository = createMockPropertiesRepository();
          const appLockRepository = createMockAppLockRepository();

          render(
            withTheme(
              <PrivacySection
                appLockRepository={appLockRepository}
                appLockState={appLockState}
                propertiesRepository={propertiesRepository}
              />,
            ),
            {wrapper: rootProviderWrapper},
          );

          const checkbox = screen.getByRole('checkbox', {name: /applock/i});
          expect(checkbox).not.toBeChecked();
        });
      });

      describe('and MDM override is disabled', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
            managedConfig: {
              applockOverride: false,
            },
          } as any);
        });

        it('should not disable the app lock checkbox', () => {
          const appLockState = createMockAppLockState({
            isAppLockAvailable: ko.pureComputed(() => true),
            isAppLockEnabled: ko.pureComputed(() => false),
          });
          const propertiesRepository = createMockPropertiesRepository();
          const appLockRepository = createMockAppLockRepository();

          render(
            withTheme(
              <PrivacySection
                appLockRepository={appLockRepository}
                appLockState={appLockState}
                propertiesRepository={propertiesRepository}
              />,
            ),
            {wrapper: rootProviderWrapper},
          );

          const checkbox = screen.getByRole('checkbox', {name: /applock/i});
          expect(checkbox).not.toBeDisabled();
        });
      });

      describe('and managedConfig is missing', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue({
            version: '1.0',
          } as any);
        });

        it('should not disable the app lock checkbox', () => {
          const appLockState = createMockAppLockState({
            isAppLockAvailable: ko.pureComputed(() => true),
            isAppLockEnabled: ko.pureComputed(() => false),
          });
          const propertiesRepository = createMockPropertiesRepository();
          const appLockRepository = createMockAppLockRepository();

          render(
            withTheme(
              <PrivacySection
                appLockRepository={appLockRepository}
                appLockState={appLockState}
                propertiesRepository={propertiesRepository}
              />,
            ),
            {wrapper: rootProviderWrapper},
          );

          const checkbox = screen.getByRole('checkbox', {name: /applock/i});
          expect(checkbox).not.toBeDisabled();
        });
      });

      describe('and desktopConfig is missing entirely', () => {
        beforeEach(() => {
          desktopConfigSpy.mockReturnValue(undefined);
        });

        it('should not disable the app lock checkbox', () => {
          const appLockState = createMockAppLockState({
            isAppLockAvailable: ko.pureComputed(() => true),
            isAppLockEnabled: ko.pureComputed(() => false),
          });
          const propertiesRepository = createMockPropertiesRepository();
          const appLockRepository = createMockAppLockRepository();

          render(
            withTheme(
              <PrivacySection
                appLockRepository={appLockRepository}
                appLockState={appLockState}
                propertiesRepository={propertiesRepository}
              />,
            ),
            {wrapper: rootProviderWrapper},
          );

          const checkbox = screen.getByRole('checkbox', {name: /applock/i});
          expect(checkbox).not.toBeDisabled();
        });
      });
    });

    describe('when MDM config is disabled', () => {
      beforeEach(() => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: false,
          },
        } as any);
      });

      it('should not disable the app lock checkbox even if desktopConfig has applockOverride', () => {
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: true,
          },
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).not.toBeDisabled();
      });
    });

    describe('when app lock is enforced by team', () => {
      it('should disable the app lock checkbox', () => {
        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnforced: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).toBeDisabled();
      });

      it('should still be disabled if also overridden by MDM', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: true,
          },
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnforced: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).toBeDisabled();
      });
    });

    describe('edge cases', () => {
      it('should handle applockOverride as non-boolean value safely', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: 1 as any, // Invalid: number instead of boolean
          },
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        // Should not be disabled because 1 !== true (strict comparison)
        expect(checkbox).not.toBeDisabled();
      });

      it('should handle stale desktop config gracefully', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
        // Old config format without managedConfig
        desktopConfigSpy.mockReturnValue({
          version: '0.5',
          supportsCallingPopoutWindow: true,
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).not.toBeDisabled();
      });

      it('should handle applockOverride with undefined value', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: undefined,
          },
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).not.toBeDisabled();
      });

      it('should handle applockOverride with null value', () => {
        configSpy.mockReturnValue({
          FEATURE: {
            ENABLE_MDM_CONFIG: true,
          },
        } as any);
        desktopConfigSpy.mockReturnValue({
          version: '1.0',
          managedConfig: {
            applockOverride: null,
          },
        } as any);

        const appLockState = createMockAppLockState({
          isAppLockAvailable: ko.pureComputed(() => true),
          isAppLockEnabled: ko.pureComputed(() => true),
        });
        const propertiesRepository = createMockPropertiesRepository();
        const appLockRepository = createMockAppLockRepository();

        render(
          withTheme(
            <PrivacySection
              appLockRepository={appLockRepository}
              appLockState={appLockState}
              propertiesRepository={propertiesRepository}
            />,
          ),
          {wrapper: rootProviderWrapper},
        );

        const checkbox = screen.getByRole('checkbox', {name: /applock/i});
        expect(checkbox).not.toBeDisabled();
      });
    });
  });
});
