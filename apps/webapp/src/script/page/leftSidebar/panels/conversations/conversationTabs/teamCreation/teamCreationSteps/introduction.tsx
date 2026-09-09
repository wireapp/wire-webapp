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

import type {ReactNode} from 'react';

import {Button, CheckRoundIcon, Link} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';

import {StepProps} from './stepProps';
import {
  checkIconCss,
  introItemCss,
  introStepLinkCss,
  introStepSubHeaderCss,
  modalButtonsCss,
} from './teamCreationSteps.styles';

import {buttonCss} from '../teamCreation.styles';

type RenderIntroductionListItemOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translatedText: string;
};

function renderIntroductionListItem(options: RenderIntroductionListItemOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, translatedText} = options;

  if (isReactTranslationRenderingEnabled) {
    return (
      <span className="text" data-uie-name="team-creation-intro-list-item">
        {renderReactTranslation({
          translatedText,
          componentReplacements: [
            {
              start: '<strong>',
              end: '</strong>',
              render(children): ReactNode {
                return <strong>{children}</strong>;
              },
            },
          ],
          nodeReplacements: [],
          valueReplacements: [],
        })}
      </span>
    );
  }

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: translatedText,
      }}
      className="text"
      data-uie-name="team-creation-intro-list-item"
    />
  );
}

export const Introduction = ({onNextStep}: StepProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
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
      {featuresList.map(listItem => {
        return (
          <div css={introItemCss} key={listItem}>
            <CheckRoundIcon css={checkIconCss} />

            {renderIntroductionListItem({
              isReactTranslationRenderingEnabled,
              translatedText: listItem,
            })}
          </div>
        );
      })}

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
