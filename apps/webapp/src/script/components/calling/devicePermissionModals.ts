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

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {PrimaryModalTranslatedMessage} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {Config} from 'src/script/Config';
import type {Translate} from 'Util/localizerUtil';

type ModalFocusContext = {
  container?: HTMLElement;
  close: () => void;
};

export const showNoAudioInputModal = (translate: Translate, focusContext: ModalFocusContext): void => {
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      primaryAction: {
        text: translate('modalAcknowledgeAction'),
      },
      secondaryAction: {
        action: () => {
          return amplify.publish(WebAppEvents.PREFERENCES.SHOW_AV);
        },
        text: translate('modalNoAudioInputAction'),
      },
      text: {
        closeBtnLabel: translate('modalNoAudioCloseBtn'),
        message: translate('modalNoAudioInputMessage'),
        title: translate('modalNoAudioInputTitle'),
      },
      close: focusContext.close,
      container: focusContext.container,
    },
    undefined,
    translate,
  );
};

export const showNoCameraModal = (translate: Translate, focusContext: ModalFocusContext): void => {
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        closeBtnLabel: translate('modalNoCameraCloseBtn'),
        translatedMessage: {
          compatibilityReplacements: [],
          components: [
            {kind: 'line-break', legacyTokens: [], markerName: 'br'},
            {
              className: '',
              dataUieName: 'go-no-camera-faq',
              href: Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED,
              kind: 'link',
              legacyClosingTokens: [],
              legacyOpeningTokens: [],
              markerName: 'faqLink',
              rel: 'noopener noreferrer',
              target: '_blank',
            },
          ],
          kind: 'translation',
          layout: 'default',
          translationKey: 'modalNoCameraMessage',
          values: [
            {
              alternatePlaceholders: [],
              placeholder: 'brandName',
              runtimeText: Config.getConfig().BRAND_NAME,
            },
          ],
        } satisfies PrimaryModalTranslatedMessage,
        title: translate('modalNoCameraTitle'),
      },
      close: focusContext.close,
      container: focusContext.container,
    },
    undefined,
    translate,
  );
};
