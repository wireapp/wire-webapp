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

import React, {useEffect} from 'react';

import type {RegisterData} from '@wireapp/api-client/lib/auth/';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {ActionLink, CodeInput, FlexBox, Text} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {Page} from './Page';
import {styles} from './VerifyEmailCode.styles';

import {AccountRegistrationLayout} from '../component/AccountRegistrationLayout';
import {BackButton} from '../component/BackButton';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import {PageView, trackTelemetryPageView} from '../util/trackingUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const VerifyEmailCodeComponent = ({
  account,
  authError,
  entropyData,
  doRegisterPersonal,
  doSendActivationCode,
}: Props & ConnectedProps & DispatchProps) => {
  const navigate = useNavigate();

  const logger = getLogger('VerifyEmailCode');
  const createAccount = async (email_code?: string) => {
    try {
      const validAccount: RegisterData = {
        ...account,
        email_code,
      };
      await doRegisterPersonal(validAccount, entropyData);
      navigate(ROUTE.SET_HANDLE, {state: {isNewAccount: true}});
    } catch (error) {
      trackTelemetryPageView(PageView.ACCOUNT_VERIFICATION_FAILED_SCREEN_2_5);
      logger.error('Failed to create personal account', error);
    }
  };

  const resendCode = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!account.email) {
      return;
    }

    try {
      await doSendActivationCode(account.email);
    } catch (error) {
      logger.error('Failed to send email code', error);
    }
  };

  useEffect(() => {
    trackTelemetryPageView(PageView.ACCOUNT_VERIFICATION_SCREEN_2);
  }, []);

  return (
    <Page hasAccountData>
      <AccountRegistrationLayout>
        <FlexBox css={styles.container}>
          <FlexBox css={styles.header}>
            <BackButton />
            <p css={styles.headline}>{t('verify.headline')}</p>
          </FlexBox>
          <Text block data-uie-name="label-with-email" css={styles.subhead}>
            <FormattedMessage
              id="verify.subhead"
              values={{
                email: account.email,
                newline: <br />,
              }}
            />
          </Text>
          <CodeInput
            style={styles.codeInput}
            onCodeComplete={createAccount}
            data-uie-name="enter-code"
            codeInputLabel={t('verify.codeLabel')}
            codePlaceholder={t('verify.codePlaceholder')}
          />
          {parseError(authError)}
          <ActionLink onClick={resendCode} data-uie-name="do-resend-code" css={styles.resendLink}>
            {t('verify.resendCode')}
          </ActionLink>
        </FlexBox>
      </AccountRegistrationLayout>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  account: AuthSelector.getAccount(state),
  authError: AuthSelector.getError(state),
  entropyData: AuthSelector.getEntropy(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doRegisterPersonal: ROOT_ACTIONS.authAction.doRegisterPersonal,
      doSendActivationCode: ROOT_ACTIONS.userAction.doSendActivationCode,
    },
    dispatch,
  );

const VerifyEmailCode = connect(mapStateToProps, mapDispatchToProps)(VerifyEmailCodeComponent);

export {VerifyEmailCode};
