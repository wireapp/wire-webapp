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

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Button, ButtonVariant, Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {showAppNotification} from 'Components/AppNotification';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';
import {EventName} from 'Repositories/tracking/EventName';
import {Segmentation} from 'Repositories/tracking/Segmentation';
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

import {UserState} from '../../../user/UserState';

const logger = getLogger('CallQualityFeedback');

export const QualityFeedbackModal = () => {
  const userState = container.resolve(UserState);

  const [isChecked, setIsChecked] = useState(false);
  const {setQualityFeedbackModalShown, qualityFeedbackModalShown} = useCallAlertState();
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  if (!qualityFeedbackModalShown) {
    return null;
  }

  const handleCloseModal = () => {
    if (!selfUser) {
      setQualityFeedbackModalShown(false);
      return;
    }

    try {
      const qualityFeedbackStorage = localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY);
      const currentStorageData = qualityFeedbackStorage ? JSON.parse(qualityFeedbackStorage) : {};
      const currentDate = new Date();
      const dateUntilShowModal = new Date(currentDate.getTime() + CALL_SURVEY_MUTE_INTERVAL);

      currentStorageData[selfUser.id] = isChecked ? null : dateUntilShowModal.getTime();
      localStorage.setItem(CALL_QUALITY_FEEDBACK_KEY, JSON.stringify(currentStorageData));
      showAppNotification(t('qualityFeedback.notificationSubmitted'));
    } catch (error) {
      logger.warn(`Can't send feedback: ${(error as Error).message}`);
    } finally {
      setQualityFeedbackModalShown(false);
    }
  };

  const sendQualityFeedback = (score: number) => {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.SCORE]: score,
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
    });

    handleCloseModal();
  };

  const skipQualityFeedback = () => {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
    });

    handleCloseModal();
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
