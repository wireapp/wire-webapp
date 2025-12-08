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

import {StatusCodes} from 'http-status-codes';
import {container} from 'tsyringe';

import {Button, ButtonVariant, Checkbox, Link} from '@wireapp/react-ui-kit';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {TeamService} from 'Repositories/team/TeamService';
import {Config} from 'src/script/Config';
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

export const Confirmation = ({onPreviousStep, onNextStep, teamName, goToFirstStep, onSuccess}: StepProps) => {
  const confirmationList = [
    t('teamCreationConfirmListItem1'),
    t('teamCreationConfirmListItem2'),
    t('teamCreationConfirmListItem3'),
  ];

  const [isMigrationAccepted, setIsMigrationAccepted] = useState(false);
  const [isTermOfUseAccepted, setIsTermOfUseAccepted] = useState(false);
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
      if (error.code === StatusCodes.FORBIDDEN) {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          primaryAction: {
            action: onSuccess,
            text: t('teamCreationAlreadyInTeamErrorActionText'),
          },
          close: onSuccess,
          text: {
            message: t('teamCreationAlreadyInTeamErrorMessage'),
            title: t('teamCreationAlreadyInTeamErrorTitle'),
          },
        });
      } else {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          primaryAction: {
            action: goToFirstStep,
            text: t('teamCreationGeneralErrorActionText'),
          },
          close: goToFirstStep,
          text: {
            message: t('teamCreationGeneralErrorMessage'),
            title: t('teamCreationGeneralErrorTitle'),
          },
        });
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
