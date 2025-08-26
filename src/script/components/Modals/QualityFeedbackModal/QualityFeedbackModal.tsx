/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant, Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import {useAppNotification} from 'Components/AppNotification';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {trackCallQualityFeedback} from 'Repositories/tracking/Helpers';
import {UserState} from 'Repositories/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {CALL_QUALITY_FEEDBACK_KEY, CALL_SURVEY_MUTE_INTERVAL, ratingListItems} from './constants';
import {
  buttonStyle,
  buttonWrapper,
  description,
  ratingItemBubble,
  ratingItemHeading,
  ratingList,
  title,
  wrapper,
} from './QualityFeedbackModal.styles';

const logger = getLogger('CallQualityFeedback');

interface Props {
  callingRepository: CallingRepository;
}

export const QualityFeedbackModal = ({callingRepository}: Props) => {
  const userState = container.resolve(UserState);
  const {conversationId} = useCallAlertState();
  const call = conversationId && callingRepository.findCall(conversationId);
  const [isChecked, setIsChecked] = useState(false);
  const {setQualityFeedbackModalShown, qualityFeedbackModalShown, setConversationId} = useCallAlertState();
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const submittedNotification = useAppNotification({
    message: t('qualityFeedback.notificationSubmitted'),
  });

  if (!qualityFeedbackModalShown) {
    return null;
  }

  if (!call) {
    logger.warn('Call not found for conversationId', conversationId);
    setQualityFeedbackModalShown(false);
    return null;
  }

  const handleCloseModal = ({skipNotification = false} = {}) => {
    if (!selfUser) {
      setQualityFeedbackModalShown(false);
      setConversationId();
      return;
    }

    try {
      const qualityFeedbackStorage = localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY);
      const currentStorageData = qualityFeedbackStorage ? JSON.parse(qualityFeedbackStorage) : {};
      const currentDate = new Date();
      const dateUntilShowModal = new Date(currentDate.getTime() + CALL_SURVEY_MUTE_INTERVAL);

      currentStorageData[selfUser.id] = isChecked ? null : dateUntilShowModal.getTime();
      localStorage.setItem(CALL_QUALITY_FEEDBACK_KEY, JSON.stringify(currentStorageData));

      if (!skipNotification) {
        submittedNotification.show();
      }
    } catch (error) {
      logger.warn(`Can't send feedback: ${(error as Error).message}`);
    } finally {
      setQualityFeedbackModalShown(false);
      setConversationId();
    }
  };

  const sendQualityFeedback = (score: number) => {
    trackCallQualityFeedback({call, score, label: RatingListLabel.ANSWERED});

    handleCloseModal();
  };

  const skipQualityFeedback = () => {
    trackCallQualityFeedback({call, label: RatingListLabel.DISMISSED});
    handleCloseModal({skipNotification: true});
  };

  return (
    <ModalComponent isShown data-uie-name="modal-call-quality-feedback" className="quality-feedback">
      <div css={wrapper}>
        <h2 css={title}>{t('qualityFeedback.heading')}</h2>

        <p css={description}>{t('qualityFeedback.description')}</p>

        <ul css={ratingList}>
          {ratingListItems.map(ratingItem => (
            <li key={ratingItem.value}>
              {ratingItem?.headingTranslationKey && (
                // @ts-expect-error
                // headingTranslationKey has to broad type to specify it
                // TODO: narrow down the type
                <div css={ratingItemHeading}>{t(ratingItem.headingTranslationKey)}</div>
              )}
              <Button
                variant={ButtonVariant.TERTIARY}
                type="button"
                onClick={() => sendQualityFeedback(ratingItem.value)}
                data-uie-name="go-rate-call-quality-feedback"
                data-uie-value={ratingItem.value}
                css={ratingItemBubble}
              >
                {ratingItem.value}
              </Button>
            </li>
          ))}
        </ul>

        <div css={buttonWrapper}>
          <Button
            variant={ButtonVariant.TERTIARY}
            type="button"
            onClick={skipQualityFeedback}
            data-uie-name="go-skip-call-quality-feedback"
            css={buttonStyle}
          >
            {t('qualityFeedback.skip')}
          </Button>
        </div>

        <div>
          <Checkbox
            checked={isChecked}
            data-uie-name="do-not-ask-again-checkbox"
            id="do-not-ask-again-checkbox"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIsChecked(event.target.checked)}
          >
            <CheckboxLabel className="label-xs" htmlFor="do-not-ask-again-checkbox">
              {t('qualityFeedback.doNotAskAgain')}
            </CheckboxLabel>
          </Checkbox>
        </div>
      </div>
    </ModalComponent>
  );
};
