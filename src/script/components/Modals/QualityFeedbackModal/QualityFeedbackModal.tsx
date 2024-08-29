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

import {Button, ButtonVariant, Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/ModalComponent';
import {StringIdentifer, t} from 'Util/LocalizerUtil';

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

type RatingListItem = {
  value: number;
  headingTranslationKey?: StringIdentifer;
};

const ratingListItems: RatingListItem[] = [
  {value: 1, headingTranslationKey: 'qualityFeedback.bad'},
  {value: 2},
  {value: 3, headingTranslationKey: 'qualityFeedback.fair'},
  {value: 4},
  {value: 5, headingTranslationKey: 'qualityFeedback.excellent'},
];

interface QualityFeedbackModalProps {}

export const QualityFeedbackModal = ({}: QualityFeedbackModalProps) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <ModalComponent
      isShown
      // onBgClick={onClose}
      // onClosed={onClose}
      data-uie-name="modal-call-quality-feedback"
      className="quality-feedback"
    >
      <div css={wrapper}>
        <h2 css={title}>{t('qualityFeedback.heading')}</h2>

        <p css={description}>{t('qualityFeedback.description')}</p>

        <ul css={ratingList}>
          {ratingListItems.map(ratingItem => (
            <li key={ratingItem.value}>
              {ratingItem?.headingTranslationKey && (
                <div css={ratingItemHeading}>{t(ratingItem.headingTranslationKey)}</div>
              )}
              <button css={ratingItemBubble}>{ratingItem.value}</button>
            </li>
          ))}
        </ul>

        <div css={buttonWrapper}>
          <Button
            variant={ButtonVariant.TERTIARY}
            type="button"
            onClick={() => {}}
            data-uie-name="go-skip-call-quality-feedback"
            css={buttonStyle}
          >
            {t('qualityFeedback.skip')}
          </Button>
        </div>

        <div>
          <Checkbox
            checked={isChecked}
            data-uie-name="modal-option-checkbox"
            id="clear-data-checkbox"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIsChecked(event.target.checked)}
          >
            <CheckboxLabel className="label-xs" htmlFor="clear-data-checkbox">
              {t('qualityFeedback.doNotAskAgain')}
            </CheckboxLabel>
          </Checkbox>
        </div>
      </div>
    </ModalComponent>
  );
};
