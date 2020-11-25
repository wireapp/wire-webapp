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

import {
  ForbiddenPhoneNumberError,
  InvalidPhoneNumberError,
  LoginData,
  PasswordExistsError,
} from '@wireapp/api-client/src/auth';
import {ClientType} from '@wireapp/api-client/src/client/index';
import {
  ArrowIcon,
  COLOR,
  Checkbox,
  CheckboxLabel,
  Column,
  Columns,
  Container,
  ContainerXS,
  Form,
  H1,
  IsMobile,
  Link,
} from '@wireapp/react-ui-kit';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {loginStrings, phoneLoginStrings} from '../../strings';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import PhoneLoginForm from '../component/PhoneLoginForm';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {Runtime} from '@wireapp/commons';
import {isValidationError, parseError, parseValidationErrors} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const PhoneLogin = ({
  pushLoginData,
  doSendPhoneLoginCode,
  isFetching,
  loginData,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();

  const [error, setError] = useState();

  const handleSubmit = async (formLoginData: Partial<LoginData>, validationErrors: Error[]) => {
    try {
      if (validationErrors.length) {
        throw validationErrors[0];
      }
      await pushLoginData({phone: formLoginData.phone});
      await doSendPhoneLoginCode({phone: formLoginData.phone});
      return history.push(ROUTE.VERIFY_PHONE_CODE);
    } catch (error) {
      switch (true) {
        case error instanceof PasswordExistsError: {
          return history.push(ROUTE.CHECK_PASSWORD);
        }
        case error instanceof ValidationError:
        case error instanceof InvalidPhoneNumberError:
        case error instanceof ForbiddenPhoneNumberError: {
          setError(error);
          break;
        }
        default: {
          setError(error);
          throw error;
        }
      }
    }
  };

  const backArrow = (
    <Link
      onClick={() => {
        history.push(ROUTE.LOGIN);
      }}
      data-uie-name="go-login"
    >
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </Link>
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
                      tabIndex={4}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        pushLoginData({clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT});
                      }}
                      checked={loginData.clientType === ClientType.TEMPORARY}
                      data-uie-name="enter-public-computer-phone-sign-in"
                      style={{justifyContent: 'center', marginTop: '12px'}}
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

export default connect(mapStateToProps, mapDispatchToProps)(PhoneLogin);
