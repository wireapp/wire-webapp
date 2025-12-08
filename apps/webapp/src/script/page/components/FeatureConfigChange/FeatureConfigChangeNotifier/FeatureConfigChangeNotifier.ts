/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useEffect, useRef} from 'react';

import {
  FeatureList,
  FeatureWithoutConfig,
  FEATURE_KEY,
  FEATURE_STATUS,
  SELF_DELETING_TIMEOUT,
} from '@wireapp/api-client/lib/team/feature/';
import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ButtonAction} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {formatDuration} from 'Util/TimeUtil';

import {loadFeatureConfig, saveFeatureConfig} from './FeatureConfigChangeNotifier.store';

import {Config} from '../../../../Config';

type Features =
  | 'FileSharing'
  | 'AudioVideo'
  | 'Applock'
  | 'DownloadPath'
  | 'SelfDeletingMessages'
  | 'ConferenceCalling'
  | 'ConversationGuestLinks';

type Title = `featureConfigChangeModal${Features}Headline`;

type FeatureNotificationMessage = {
  htmlMessage: string;
  title: Title;
  primaryAction?: ButtonAction;
};

const featureNotifications: Record<string, (oldConfig: any, newConfig: any) => FeatureNotificationMessage | undefined> =
  {
    [FEATURE_KEY.FILE_SHARING]: (
      oldConfig: FeatureList[FEATURE_KEY.FILE_SHARING],
      newConfig: FeatureList[FEATURE_KEY.FILE_SHARING],
    ) => {
      const status = wasTurnedOnOrOff(oldConfig, newConfig);
      if (!status) {
        return undefined;
      }
      return {
        htmlMessage:
          status === FEATURE_STATUS.ENABLED
            ? t('featureConfigChangeModalFileSharingDescriptionItemFileSharingEnabled')
            : t('featureConfigChangeModalFileSharingDescriptionItemFileSharingDisabled'),
        title: 'featureConfigChangeModalFileSharingHeadline',
      };
    },
    [FEATURE_KEY.VIDEO_CALLING]: (
      oldConfig: FeatureList[FEATURE_KEY.VIDEO_CALLING],
      newConfig: FeatureList[FEATURE_KEY.VIDEO_CALLING],
    ) => {
      const status = wasTurnedOnOrOff(oldConfig, newConfig);
      if (!status) {
        return undefined;
      }
      return {
        htmlMessage:
          status === FEATURE_STATUS.ENABLED
            ? t('featureConfigChangeModalAudioVideoDescriptionItemCameraEnabled')
            : t('featureConfigChangeModalAudioVideoDescriptionItemCameraDisabled'),
        title: 'featureConfigChangeModalAudioVideoHeadline',
      };
    },

    [FEATURE_KEY.APPLOCK]: (
      oldConfig: FeatureList[FEATURE_KEY.APPLOCK],
      newConfig: FeatureList[FEATURE_KEY.APPLOCK],
    ) => {
      const shouldWarn = oldConfig?.config.enforceAppLock === true && newConfig?.config.enforceAppLock === false;
      if (!shouldWarn) {
        return undefined;
      }
      return {
        htmlMessage: t('featureConfigChangeModalApplock'),
        title: 'featureConfigChangeModalApplockHeadline',
      };
    },

    [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]: (
      oldConfig: FeatureList[FEATURE_KEY.ENFORCE_DOWNLOAD_PATH],
      newConfig: FeatureList[FEATURE_KEY.ENFORCE_DOWNLOAD_PATH],
    ) => {
      const handleDlPathChange: (
        status: FEATURE_STATUS | undefined,
      ) => undefined | {htmlMessage: string; title: Title; primaryAction?: ButtonAction} = status => {
        if (newConfig && 'config' in newConfig) {
          localStorage.setItem('enforcedDownloadLocation', newConfig.config.enforcedDownloadLocation);
          amplify.publish(
            WebAppEvents.TEAM.DOWNLOAD_PATH_UPDATE,
            newConfig.status === FEATURE_STATUS.ENABLED ? newConfig.config.enforcedDownloadLocation : undefined,
          );
        }

        let htmlMessage: string;
        switch (status) {
          case FEATURE_STATUS.ENABLED:
            htmlMessage = t('featureConfigChangeModalDownloadPathEnabled');
            break;
          case FEATURE_STATUS.DISABLED:
            htmlMessage = t('featureConfigChangeModalDownloadPathDisabled');
            break;
          default:
            htmlMessage = t('featureConfigChangeModalDownloadPathChanged');
        }

        return {
          htmlMessage,
          title: 'featureConfigChangeModalDownloadPathHeadline',
          primaryAction: {
            action: () => {
              if (Runtime.isDesktopApp() && status !== FEATURE_STATUS.DISABLED) {
                amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
              }
            },
          },
        };
      };

      if (!oldConfig && newConfig?.status === FEATURE_STATUS.ENABLED && 'config' in newConfig) {
        return handleDlPathChange(FEATURE_STATUS.ENABLED);
      }

      if (
        newConfig &&
        'config' in newConfig &&
        oldConfig &&
        'config' in oldConfig &&
        Runtime.isDesktopApp() &&
        Runtime.isWindows()
      ) {
        const status = wasTurnedOnOrOff(oldConfig, newConfig);
        const configStatus =
          newConfig?.config?.enforcedDownloadLocation !== oldConfig?.config?.enforcedDownloadLocation;

        // separate call for type narrowing
        if (!status) {
          return undefined;
        }
        if (!configStatus) {
          return undefined;
        }

        localStorage.setItem('enforcedDownloadLocation', newConfig.config.enforcedDownloadLocation);
        return handleDlPathChange(status);
      }
      return undefined;
    },
    [FEATURE_KEY.SELF_DELETING_MESSAGES]: (
      oldConfig: FeatureList[FEATURE_KEY.SELF_DELETING_MESSAGES],
      newConfig: FeatureList[FEATURE_KEY.SELF_DELETING_MESSAGES],
    ) => {
      if (!oldConfig || !('config' in oldConfig) || !newConfig || !('config' in newConfig)) {
        return undefined;
      }
      const previousTimeout = oldConfig?.config?.enforcedTimeoutSeconds * 1000;
      const newTimeout = (newConfig?.config?.enforcedTimeoutSeconds ?? 0) * 1000;
      const previousStatus = oldConfig?.status;
      const newStatus = newConfig?.status;

      const hasTimeoutChanged = previousTimeout !== newTimeout;
      const isEnforced = newTimeout > SELF_DELETING_TIMEOUT.OFF;
      const hasStatusChanged = previousStatus !== newStatus;
      const hasFeatureChanged = hasStatusChanged || hasTimeoutChanged;
      const isFeatureEnabled = newStatus === FEATURE_STATUS.ENABLED;

      if (!hasFeatureChanged) {
        return undefined;
      }
      return {
        htmlMessage: isFeatureEnabled
          ? isEnforced
            ? t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnforced', {
                timeout: formatDuration(newTimeout).text,
              })
            : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled')
          : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemDisabled'),
        title: 'featureConfigChangeModalSelfDeletingMessagesHeadline',
      };
    },
    [FEATURE_KEY.CONFERENCE_CALLING]: (
      oldConfig: FeatureList[FEATURE_KEY.CONFERENCE_CALLING],
      newConfig: FeatureList[FEATURE_KEY.CONFERENCE_CALLING],
    ) => {
      const status = wasTurnedOnOrOff(oldConfig, newConfig);
      if (!status || status === FEATURE_STATUS.DISABLED) {
        return undefined;
      }
      const replaceEnterprise = replaceLink(
        Config.getConfig().URL.PRICING,
        'modal__text__read-more',
        'read-more-pricing',
      );

      return {
        htmlMessage: t(
          'featureConfigChangeModalConferenceCallingEnabled',
          {brandName: Config.getConfig().BRAND_NAME},
          replaceEnterprise,
        ),
        title: 'featureConfigChangeModalConferenceCallingHeadline',
      };
    },
    [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: (
      oldConfig: FeatureList[FEATURE_KEY.CONVERSATION_GUEST_LINKS],
      newConfig: FeatureList[FEATURE_KEY.CONVERSATION_GUEST_LINKS],
    ) => {
      const status = wasTurnedOnOrOff(oldConfig, newConfig);
      if (!status) {
        return undefined;
      }
      return {
        htmlMessage:
          status === FEATURE_STATUS.ENABLED
            ? t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksEnabled')
            : t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksDisabled'),
        title: 'featureConfigChangeModalConversationGuestLinksHeadline',
      };
    },
  } as const;

function wasTurnedOnOrOff(
  oldConfig?: FeatureWithoutConfig,
  newConfig?: FeatureWithoutConfig,
): FEATURE_STATUS | undefined {
  if (oldConfig?.status && newConfig?.status && oldConfig.status !== newConfig.status) {
    return newConfig.status === FEATURE_STATUS.ENABLED ? FEATURE_STATUS.ENABLED : FEATURE_STATUS.DISABLED;
  }
  return undefined;
}

const logger = getLogger('FeatureConfigChangeNotifier');
type Props = {
  teamState: TeamState;
  selfUserId: string;
};

export function FeatureConfigChangeNotifier({teamState, selfUserId}: Props): null {
  const {teamFeatures: config} = useKoSubscribableChildren(teamState, ['teamFeatures']);
  const previousConfig = useRef<FeatureList | undefined>(loadFeatureConfig(selfUserId));

  useEffect(() => {
    const previous = previousConfig.current;
    if (config) {
      previousConfig.current = config;
      saveFeatureConfig(selfUserId, config);
    }

    if (!previous) {
      return;
    }
    if (!config) {
      return;
    }

    for (const [feature, getMessage] of Object.entries(featureNotifications)) {
      const featureKey = feature as FEATURE_KEY;
      const message = getMessage(previous[featureKey], config[featureKey]);
      const isEnforceDownloadPath = featureKey === FEATURE_KEY.ENFORCE_DOWNLOAD_PATH;

      if (!message) {
        continue;
      }

      logger.info(
        `Detected feature config change for "${feature}" from "${JSON.stringify(
          previous?.[featureKey],
        )}" to "${JSON.stringify(config[featureKey])}"`,
      );
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          htmlMessage: message.htmlMessage,
          title: t(message.title, {
            brandName: Config.getConfig().BRAND_NAME,
          }),
        },
        primaryAction: message.primaryAction,
        hideCloseBtn: isEnforceDownloadPath,
        preventClose: isEnforceDownloadPath,
        close: isEnforceDownloadPath
          ? () => {
              if (Runtime.isDesktopApp() && config[featureKey]?.status !== FEATURE_STATUS.DISABLED) {
                amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
              }
            }
          : undefined,
      });
    }
  }, [config, selfUserId]);

  return null;
}
