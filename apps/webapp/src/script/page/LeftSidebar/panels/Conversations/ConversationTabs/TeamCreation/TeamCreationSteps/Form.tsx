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

import {Button, ButtonVariant, Input} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {StepProps} from './StepProps';
import {modalButtonsCss} from './TeamCreationSteps.styles';

import {buttonCss} from '../TeamCreation.styles';

export const Form = ({onNextStep, onPreviousStep, teamName, setTeamName}: StepProps) => {
  const trimmedTeamName = teamName.trim();
  const isValidTeamName = trimmedTeamName.length > 0;

  function handleNextStep() {
    if (!isValidTeamName) {
      return;
    }

    setTeamName(trimmedTeamName);
    onNextStep();
  }

  return (
    <>
      <h2 className="heading-h2">{t('teamCreationFormTitle')}</h2>
      <p css={{margin: '1.5rem 0'}} className="text-regular">
        {t('teamCreationFormSubTitle')}
      </p>
      <Input
        type="text"
        value={teamName}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTeamName(event.target.value)}
        label={t('teamCreationFormNameLabel')}
        autoComplete="off"
        placeholder={t('teamCreationFormNamePlaceholder')}
        css={{width: '100%'}}
        data-uie-name="enter-team-name"
      />
      <div className="modal__buttons" css={modalButtonsCss}>
        <Button data-uie-name="do-go-back" onClick={onPreviousStep} variant={ButtonVariant.SECONDARY} css={buttonCss}>
          {t('teamCreationBack')}
        </Button>
        <Button data-uie-name="do-continue" disabled={!isValidTeamName} onClick={handleNextStep} css={buttonCss}>
          {t('teamCreationContinue')}
        </Button>
      </div>
    </>
  );
};
