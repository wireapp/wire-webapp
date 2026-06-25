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

import {Button, CheckRoundIcon, Link} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/config';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {StepProps} from './stepprops';
import {
  checkIconCss,
  introItemCss,
  introStepLinkCss,
  introStepSubHeaderCss,
  modalButtonsCss,
} from './teamcreationsteps.styles';

import {buttonCss} from '../teamcreation.styles';

export const Introduction = ({onNextStep}: StepProps) => {
  const {translate} = useApplicationContext();
  const featuresList = [
    translate('teamCreationIntroListItem1'),
    translate('teamCreationIntroListItem2'),
    translate('teamCreationIntroListItem3'),
    translate('teamCreationIntroListItem4'),
    translate('teamCreationIntroListItem5'),
  ];

  return (
    <>
      <h2 className="heading-h2" data-uie-name="team-creation-intro-title">
        {translate('teamCreationIntroTitle')}
      </h2>
      <p className="text-regular" data-uie-name="team-creation-intro-sub-title" css={introStepSubHeaderCss}>
        {translate('teamCreationIntroSubTitle')}
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
          {translate('teamCreationIntroLink')}
        </span>
      </Link>
      <div className="modal__buttons" css={modalButtonsCss}>
        <Button css={buttonCss} onClick={onNextStep} data-uie-name="do-continue">
          {translate('teamCreationContinue')}
        </Button>
      </div>
    </>
  );
};
