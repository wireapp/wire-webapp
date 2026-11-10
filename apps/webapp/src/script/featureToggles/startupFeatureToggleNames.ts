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

export const applockRefactoredFeatureToggleName = 'applock-refactored';
export const callSecurityLineFeatureToggleName = 'call-security-line';
export const conversationListCollapseFeatureToggleName = 'conversation-list-collapse';
export const forTestsOnlyFeatureToggleName = 'for-tests-only';
export const disableMessagePreprocessingFeatureToggleName = 'disable-message-preprocessing';
export const driveBulkActionsFeatureToggleName = 'drive-bulk-actions';
export const driveBulkRestoreFeatureToggleName = 'drive-bulk-restore';
export const markAsUnreadFeatureToggleName = 'mark-as-unread';
export const troubleshooterFeatureToggleName = 'troubleshooter';

export const sendCallLogsFeatureToggleName = 'send-call-logs';
export const minimizeSelfViewFeatureToggleName = 'minimize-self-view';

export const startupFeatureToggleRegistry = [
  {name: applockRefactoredFeatureToggleName, previewDefaultEnabled: false},
  {name: callSecurityLineFeatureToggleName, previewDefaultEnabled: false},
  {name: conversationListCollapseFeatureToggleName, previewDefaultEnabled: false},
  {name: forTestsOnlyFeatureToggleName, previewDefaultEnabled: false},
  {name: disableMessagePreprocessingFeatureToggleName, previewDefaultEnabled: false},
  {name: driveBulkActionsFeatureToggleName, previewDefaultEnabled: true},
  {name: driveBulkRestoreFeatureToggleName, previewDefaultEnabled: false},
  {name: markAsUnreadFeatureToggleName, previewDefaultEnabled: true},
  {name: troubleshooterFeatureToggleName, previewDefaultEnabled: false},
  {name: sendCallLogsFeatureToggleName, previewDefaultEnabled: false},
  {name: minimizeSelfViewFeatureToggleName, previewDefaultEnabled: false},
] as const;

export type StartupFeatureToggleName = (typeof startupFeatureToggleRegistry)[number]['name'];

type StartupFeatureToggleDefinition = {
  readonly name: StartupFeatureToggleName;
  readonly previewDefaultEnabled: boolean;
};

export const startupFeatureToggleNames: readonly StartupFeatureToggleName[] = startupFeatureToggleRegistry.map(
  featureToggle => {
    return featureToggle.name;
  },
);

export function selectPreviewDefaultEnabledStartupFeatureToggleNames(
  featureDefinitions: readonly StartupFeatureToggleDefinition[],
): readonly StartupFeatureToggleName[] {
  return featureDefinitions
    .filter(featureToggle => {
      return featureToggle.previewDefaultEnabled;
    })
    .map(featureToggle => {
      return featureToggle.name;
    });
}

export const previewDefaultEnabledStartupFeatureToggleNames: readonly StartupFeatureToggleName[] =
  selectPreviewDefaultEnabledStartupFeatureToggleNames(startupFeatureToggleRegistry);

// Matches EDGE_WEBAPP_URL in .github/workflows/publish-main.yml; APP_BASE is the runtime identity source.
const WIRE_EDGE_APP_BASE_ORIGIN = 'https://wire-webapp-edge.wire.com';

export function selectDefaultEnabledStartupFeatureToggleNames(options: {
  readonly appBaseUrl: string;
  readonly defaultEnabledFeatureToggleNames: readonly StartupFeatureToggleName[];
}): readonly StartupFeatureToggleName[] {
  const {appBaseUrl, defaultEnabledFeatureToggleNames} = options;
  let appBaseOrigin: string;

  try {
    appBaseOrigin = new URL(appBaseUrl).origin;
  } catch {
    return defaultEnabledFeatureToggleNames;
  }

  if (appBaseOrigin !== WIRE_EDGE_APP_BASE_ORIGIN) {
    return defaultEnabledFeatureToggleNames;
  }

  return defaultEnabledFeatureToggleNames.includes(minimizeSelfViewFeatureToggleName)
    ? defaultEnabledFeatureToggleNames
    : [...defaultEnabledFeatureToggleNames, minimizeSelfViewFeatureToggleName];
}
