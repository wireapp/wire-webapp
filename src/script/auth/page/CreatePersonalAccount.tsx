/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {useNavigate} from 'react-router-dom';

import {FlexBox} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {styles} from './CreatePersonalAccount.styles';
import {Page} from './Page';

import {Config} from '../../Config';
import {AccountForm} from '../component/AccountForm';
import {AccountRegistrationLayout} from '../component/AccountRegistrationLayout';
import {BackButton} from '../component/BackButton';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {ROUTE} from '../route';

export const CreatePersonalAccount = () => {
  const navigate = useNavigate();
  const onSubmit = () => {
    if (Config.getConfig().FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY) {
      navigate(ROUTE.SET_ENTROPY);
    } else {
      navigate(ROUTE.VERIFY_EMAIL_CODE);
    }
  };

  return (
    <Page>
      <AccountRegistrationLayout>
        <FlexBox>
          <FlexBox css={styles.container}>
            <div css={styles.backButtonContainer}>
              <BackButton />
            </div>
            <p css={styles.header} role="heading" aria-level={1} data-page-title tabIndex={-1}>
              {t('createPersonalAccount.headLine')}
            </p>
            <AccountForm onSubmit={onSubmit} />
            <p css={styles.footer}>{t('createPersonalAccount.subHeader')}</p>
            <a css={styles.teamCreateButton} href={EXTERNAL_ROUTE.WIRE_TEAMS_SIGNUP} target="_blank" rel="noreferrer">
              {t('createPersonalAccount.createTeamButton')}
            </a>
          </FlexBox>
        </FlexBox>
      </AccountRegistrationLayout>
    </Page>
  );
};
