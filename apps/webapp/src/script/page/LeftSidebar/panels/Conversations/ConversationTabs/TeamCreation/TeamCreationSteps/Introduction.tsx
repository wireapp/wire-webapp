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

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {Button, CheckRoundIcon, Link} from '@wireapp/react-ui-kit';

import {StepProps} from './StepProps';
import {
  checkIconCss,
  introItemCss,
  introStepLinkCss,
  introStepSubHeaderCss,
  modalButtonsCss,
} from './TeamCreationSteps.styles';

import {buttonCss} from '../TeamCreation.styles';

export const Introduction = ({onNextStep}: StepProps) => {
  const featuresList = [
    t('teamCreationIntroListItem1'),
    t('teamCreationIntroListItem2'),
    t('teamCreationIntroListItem3'),
    t('teamCreationIntroListItem4'),
    t('teamCreationIntroListItem5'),
  ];

  return (
    <>
      <h2 className="heading-h2" data-uie-name="team-creation-intro-title">
        {t('teamCreationIntroTitle')}
      </h2>
      <p className="text-regular" data-uie-name="team-creation-intro-sub-title" css={introStepSubHeaderCss}>
        {t('teamCreationIntroSubTitle')}
      </p>
      {featuresList.map(listItem => (
        <div css={introItemCss} key={listItem}>
          <CheckRoundIcon css={checkIconCss} />

          <span
            dangerouslySetInnerHTML={{
              __html: listItem,
            }}
            className="text"
            data-uie-name="team-creation-intro-list-item"
          />
        </div>
      ))}

      <Link block css={introStepLinkCss} href={Config.getConfig().URL.PRICING} targetBlank>
        <span className="text-medium" data-uie-name="team-creation-intro-link">
          {t('teamCreationIntroLink')}
        </span>
      </Link>
      <div className="modal__buttons" css={modalButtonsCss}>
        <Button css={buttonCss} onClick={onNextStep} data-uie-name="do-continue">
          {t('teamCreationContinue')}
        </Button>
      </div>
    </>
  );
};
