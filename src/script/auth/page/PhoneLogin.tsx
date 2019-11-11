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

import {LoginData} from '@wireapp/api-client/dist/commonjs/auth';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {
  ArrowIcon,
  COLOR,
  Checkbox,
  CheckboxLabel,
  Column,
  Columns,
  Container,
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  IsMobile,
  Muted,
} from '@wireapp/react-ui-kit';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {getLogger} from 'Util/Logger';
import {loginStrings} from '../../strings';
import AppAlreadyOpen from '../component/AppAlreadyOpen';
import PhoneLoginForm from '../component/PhoneLoginForm';
import RouterLink from '../component/RouterLink';
import {actionRoot} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {isDesktopApp} from '../Runtime';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const PhoneLogin = ({
  loginError,
  pushLoginData,
  doSendPhoneLoginCode,
  isFetching,
  loginData,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('PhoneLogin');
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [validationErrors, setValidationErrors] = useState([]);

  const handleSubmit = async (formLoginData: Partial<LoginData>, validationErrors: Error[]) => {
    setValidationErrors(validationErrors);
    try {
      if (validationErrors.length) {
        throw validationErrors[0];
      }
      await doSendPhoneLoginCode({phone: formLoginData.phone});
      await pushLoginData({phone: formLoginData.phone});
      return history.push(ROUTE.VERIFY_PHONE_CODE);
    } catch (error) {
      logger.warn('Unable to request login code', error);
      if ((error as BackendError).label) {
        const backendError = error as BackendError;
        switch (backendError.label) {
          default: {
            const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
              backendError.label.endsWith(errorType),
            );
            if (!isValidationError) {
              throw backendError;
            }
          }
        }
      } else {
        throw error;
      }
    }
  };

  const backArrow = (
    <RouterLink to={ROUTE.LOGIN} data-uie-name="go-index">
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
                <H1 center>{_(loginStrings.headline)}</H1>
                <Muted>{_(loginStrings.subhead)}</Muted>
                <Form style={{marginTop: 30}} data-uie-name="login">
                  <PhoneLoginForm isFetching={isFetching} onSubmit={handleSubmit} />
                  {validationErrors.length ? (
                    parseValidationErrors(validationErrors)
                  ) : loginError ? (
                    <ErrorMessage data-uie-name="error-message">{parseError(loginError)}</ErrorMessage>
                  ) : (
                    <div style={{marginTop: '4px'}}>&nbsp;</div>
                  )}
                  {!isDesktopApp() && (
                    <Checkbox
                      tabIndex={3}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        pushLoginData({clientType: event.target.checked ? ClientType.TEMPORARY : ClientType.PERMANENT});
                      }}
                      checked={loginData.clientType === ClientType.TEMPORARY}
                      data-uie-name="enter-public-computer-sign-in"
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
  loginError: AuthSelector.getError(state),
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PhoneLogin);
