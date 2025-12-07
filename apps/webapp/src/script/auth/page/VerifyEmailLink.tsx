/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import React, {useEffect} from 'react';

import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {t} from 'Util/LocalizerUtil';

import {ContainerXS, H1, H3, Muted} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {RouterLink} from '../component/RouterLink';
import {RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const VerifyEmailLinkComponent = ({hasSelfEmail}: Props & ConnectedProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSelfEmail) {
      navigate(ROUTE.SET_PASSWORD);
    }
  }, [hasSelfEmail]);

  if (hasSelfEmail) {
    return null;
  }
  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <div>
          <H1 center data-uie-name="verify-email-headline">
            {t('authPostedResendHeadline')}
          </H1>
          <H3 center block data-uie-name="verify-email-subhead">
            {t('authPostedResendDetail')}
          </H3>
          <Muted center block style={{marginTop: 64}} data-uie-name="verify-email-no-mail">
            {t('authPostedResendAction')}
          </Muted>
          <RouterLink to={ROUTE.SET_EMAIL} data-uie-name="go-set-email">
            {t('setEmail.tryAgain')}
          </RouterLink>
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasSelfEmail: SelfSelector.hasSelfEmail(state),
});

const VerifyEmailLink = connect(mapStateToProps)(VerifyEmailLinkComponent);

export {VerifyEmailLink};
