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

import React, {useState} from 'react';

import {
  ForbiddenPhoneNumberError,
  InvalidPhoneNumberError,
  LoginData,
  PasswordExistsError,
} from '@wireapp/api-client/lib/auth';
import {ClientType} from '@wireapp/api-client/lib/client/index';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {Runtime} from '@wireapp/commons';
import {
  ArrowIcon,
  Checkbox,
  CheckboxLabel,
  COLOR,
  Column,
  Columns,
  Container,
  ContainerXS,
  Form,
  H1,
  IsMobile,
} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {loginStrings, phoneLoginStrings} from '../../strings';
import {AppAlreadyOpen} from '../component/AppAlreadyOpen';
import {PhoneLoginForm} from '../component/PhoneLoginForm';
import {RouterLink} from '../component/RouterLink';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {bindActionCreators, RootState} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {isValidationError, parseError, parseValidationErrors} from '../util/errorUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const PhoneLoginComponent = ({
  pushLoginData,
  doSendPhoneLoginCode,
  isFetching,
  loginData,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();

  const [error, setError] = useState<Error>();

  const handleSubmit = async (formLoginData: Partial<LoginData>, validationErrors: Error[]) => {
    try {
      if (validationErrors.length) {
        throw validationErrors[0];
      }
      await pushLoginData({phone: formLoginData.phone});
      await doSendPhoneLoginCode({phone: formLoginData.phone});
      return navigate(ROUTE.VERIFY_PHONE_CODE);
    } catch (error) {
      switch (true) {
        case error instanceof PasswordExistsError: {
          return navigate(ROUTE.CHECK_PASSWORD);
        }
        case error instanceof ValidationError:
        case error instanceof InvalidPhoneNumberError:
        case error instanceof ForbiddenPhoneNumberError: {
          setError(error as Error);
          break;
        }
        default: {
          setError(error as Error);
          throw error;
        }
      }
    }
  };

  const backArrow = (
    <RouterLink to={ROUTE.LOGIN} data-uie-name="go-login">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );
  return (
    <Page>
      <IsMobile>
        <div style={{margin: 16}}>{backArrow}</div>
      </IsMobile>
      <Container centerText verticalCenter style={{width: '100%'}}>
        <AppAlreadyOpen />
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>{backArrow}</div>
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>{_(phoneLoginStrings.loginHead)}</H1>
                <Form style={{marginTop: 30}} data-uie-name="login">
                  <PhoneLoginForm isFetching={isFetching} onSubmit={handleSubmit} />
                  {!error ? (
                    <div style={{marginTop: '4px'}}>&nbsp;</div>
                  ) : isValidationError(error) ? (
                    parseValidationErrors(error)
                  ) : (
                    parseError(error)
                  )}
                  {!Runtime.isDesktopApp() && (
                    <Checkbox
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        pushLoginData({clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT});
                      }}
                      checked={loginData.clientType === ClientType.TEMPORARY}
                      data-uie-name="enter-public-computer-phone-sign-in"
                      style={{justifyContent: 'center', marginTop: '12px'}}
                      aligncenter
                    >
                      <CheckboxLabel>{_(loginStrings.publicComputer)}</CheckboxLabel>
                    </Checkbox>
                  )}
                </Form>
              </div>
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
      <IsMobile>
        <div style={{minWidth: 48}} />
      </IsMobile>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isFetching: AuthSelector.isFetching(state),
  loginData: AuthSelector.getLoginData(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doSendPhoneLoginCode: actionRoot.authAction.doSendPhoneLoginCode,
      pushLoginData: actionRoot.authAction.pushLoginData,
    },
    dispatch,
  );

const PhoneLogin = connect(mapStateToProps, mapDispatchToProps)(PhoneLoginComponent);

export {PhoneLogin};
