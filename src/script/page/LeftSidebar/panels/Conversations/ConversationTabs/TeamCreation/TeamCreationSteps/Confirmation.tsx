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

import {useState} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant, Checkbox, ErrorMessage, Link} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {TeamService} from 'src/script/team/TeamService';
import {t} from 'Util/LocalizerUtil';

import {StepProps} from './StepProps';
import {
  listCss,
  modalButtonsCss,
  termsCheckboxLabelCss,
  termsOfUseLinkCss,
  termsCheckboxWrapperCss,
} from './TeamCreationSteps.styles';

import {buttonCss} from '../TeamCreation.styles';

const confirmationList = [
  t('teamCreationConfirmListItem1'),
  t('teamCreationConfirmListItem2'),
  t('teamCreationConfirmListItem3'),
];

const errorTextMap = {
  'user-already-in-a-team': t('teamCreationAlreadyInTeamError'),
  'not-found': t('teamCreationUserNotFoundError'),
};

export const Confirmation = ({onPreviousStep, onNextStep, teamName}: StepProps) => {
  const [isMigrationAccepted, setIsMigrationAccepted] = useState(false);
  const [isTermOfUseAccepted, setIsTermOfUseAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const teamService = container.resolve(TeamService);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await teamService.upgradePersonalToTeamUser({
        name: teamName,
      });
      onNextStep();
    } catch (error: any) {
      if ('label' in error) {
        setError(errorTextMap[error.label as keyof typeof errorTextMap]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="heading-h2" data-uie-name="team-creation-confirm-title">
        {t('teamCreationConfirmTitle')}
      </h2>
      <ul css={listCss} data-uie-name="team-creation-confirm-list">
        {confirmationList.map(item => (
          <li key={item}>
            <p className="text-regular">{item}</p>
          </li>
        ))}
      </ul>
      <div>
        <Checkbox
          checked={isMigrationAccepted}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setIsMigrationAccepted(event.target.checked);
          }}
          id="do-accept-migration"
          data-uie-name="do-accept-migration"
          wrapperCSS={termsCheckboxWrapperCss}
        >
          <span css={termsCheckboxLabelCss}>{t('teamCreationConfirmMigrationTermsText')}</span>
        </Checkbox>
        <Checkbox
          checked={isTermOfUseAccepted}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setIsTermOfUseAccepted(event.target.checked);
          }}
          id="do-accept-terms"
          data-uie-name="do-accept-terms"
          wrapperCSS={termsCheckboxWrapperCss}
        >
          <span css={termsCheckboxLabelCss}>
            {t('teamCreationConfirmTermsOfUseText')}{' '}
            <Link href={Config.getConfig().URL.TERMS_OF_USE_TEAMS} targetBlank>
              <span css={termsOfUseLinkCss}>{t('teamCreationConfirmTermsOfUseLink')}</span>
            </Link>
            .
          </span>
        </Checkbox>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className="modal__buttons" css={modalButtonsCss}>
        <Button data-uie-name="do-go-back" onClick={onPreviousStep} variant={ButtonVariant.SECONDARY} css={buttonCss}>
          {t('teamCreationBack')}
        </Button>
        <Button
          data-uie-name="do-create-team"
          disabled={!isMigrationAccepted || !isTermOfUseAccepted}
          css={buttonCss}
          onClick={onSubmit}
          showLoading={loading}
        >
          {t('teamCreationCreateTeam')}
        </Button>
      </div>
    </>
  );
};
