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

import React from 'react';

import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {CodeInput, ContainerXS, H1, Muted} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {Page} from './Page';

import {LinkButton} from '../component/LinkButton';
import {RouterLink} from '../component/RouterLink';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const changeEmailRedirect = {
  [AuthSelector.REGISTER_FLOW.PERSONAL]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.GENERIC_INVITATION]: ROUTE.CREATE_ACCOUNT,
  [AuthSelector.REGISTER_FLOW.TEAM]: ROUTE.CREATE_TEAM_ACCOUNT,
};

const VerifyEmailCodeComponent = ({
  account,
  authError,
  currentFlow,
  entropyData,
  doRegisterPersonal,
  doRegisterTeam,
  doSendActivationCode,
}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();

  const logger = getLogger('VerifyEmailCode');
  const createAccount = async (email_code: string) => {
    switch (currentFlow) {
      case AuthSelector.REGISTER_FLOW.TEAM: {
        try {
          await doRegisterTeam({...account, email_code});
          navigate(ROUTE.SET_HANDLE);
        } catch (error) {
          logger.error('Failed to create team account', error);
        }
        break;
      }

      case AuthSelector.REGISTER_FLOW.PERSONAL:
      case AuthSelector.REGISTER_FLOW.GENERIC_INVITATION: {
        try {
          await doRegisterPersonal({...account, email_code}, entropyData);
          navigate(ROUTE.SET_HANDLE);
        } catch (error) {
          logger.error('Failed to create personal account', error);
        }
      }
    }
  };

  const resendCode = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      await doSendActivationCode(account.email);
    } catch (error) {
      logger.error('Failed to send email code', error);
    }
  };

  return (
    <Page hasAccountData>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <div>
          <H1 center>{t('verify.headline')}</H1>
          <Muted data-uie-name="label-with-email">
            <FormattedMessage
              id="verify.subhead"
              values={{
                email: account.email,
                newline: <br />,
              }}
            />
          </Muted>
          <CodeInput style={{marginTop: 10}} onCodeComplete={createAccount} data-uie-name="enter-code" />
          {parseError(authError)}
        </div>
        <div>
          <LinkButton onClick={resendCode} data-uie-name="do-resend-code">
            {t('verify.resendCode')}
          </LinkButton>
          <RouterLink to={changeEmailRedirect[currentFlow]} style={{marginLeft: 35}} data-uie-name="go-change-email">
            {t('verify.changeEmail')}
          </RouterLink>
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  currentFlow: AuthSelector.getCurrentFlow(state),
  entropyData: AuthSelector.getEntropy(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doRegisterPersonal: ROOT_ACTIONS.authAction.doRegisterPersonal,
      doRegisterTeam: ROOT_ACTIONS.authAction.doRegisterTeam,
      doSendActivationCode: ROOT_ACTIONS.userAction.doSendActivationCode,
    },
    dispatch,
  );

const VerifyEmailCode = connect(mapStateToProps, mapDispatchToProps)(VerifyEmailCodeComponent);

export {VerifyEmailCode};
