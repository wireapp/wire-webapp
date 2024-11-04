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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {getManageTeamUrl} from 'src/script/externalRoute';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {StepProps} from './StepProps';
import {listCss, modalButtonsCss, successStepSubHeaderCss} from './TeamCreationSteps.styles';

import {buttonCss} from '../TeamCreation.styles';

export const Success = ({onSuccess, teamName, userName}: StepProps) => {
  const manageTeamUrl = getManageTeamUrl();

  return (
    <>
      <h2 className="heading-h2" data-uie-name="team-creation-success-title">
        {t('teamCreationSuccessTitle', {name: userName})}
      </h2>
      <p className="text-regular" data-uie-name="team-creation-success-sub-title" css={successStepSubHeaderCss}>
        {t('teamCreationSuccessSubTitle', {teamName})}
      </p>
      <p className="text-regular" data-uie-name="team-creation-list-header">
        {t('teamCreationSuccessListTitle')}
      </p>
      <ul css={listCss}>
        <li>
          <p className="text-regular">{t('teamCreationSuccessListItem1')}</p>
        </li>
        <li>
          <p className="text-regular">{t('teamCreationSuccessListItem2')}</p>
        </li>
      </ul>

      <div className="modal__buttons" css={modalButtonsCss}>
        <Button variant={ButtonVariant.SECONDARY} css={buttonCss} onClick={onSuccess}>
          {t('teamCreationBackToWire')}
        </Button>
        {manageTeamUrl && (
          <Button data-uie-name="do-open-team-management" onClick={() => safeWindowOpen(manageTeamUrl)} css={buttonCss}>
            {t('teamCreationOpenTeamManagement')}
          </Button>
        )}
      </div>
    </>
  );
};
