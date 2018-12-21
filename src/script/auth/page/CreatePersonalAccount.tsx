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

import {RegisterData} from '@wireapp/api-client/dist/commonjs/auth';
import {ArrowIcon, COLOR, Column, Columns, Container, ContainerXS, H1, IsMobile, Link} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {Link as RRLink} from 'react-router-dom';
import {createPersonalAccountStrings} from '../../strings';
import AccountForm from '../component/AccountForm';
import ROOT_ACTIONS from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
import {RegistrationDataState} from '../module/reducer/authReducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import Page from './Page';

interface URLParams {
  invitationCode: string;
}

interface Props extends React.HTMLAttributes<CreatePersonalAccount>, RouteComponentProps<URLParams> {}

interface ConnectedProps {
  account: RegistrationDataState;
  currentFlow: string;
  isPersonalFlow: boolean;
}

interface DispatchProps {
  enterPersonalCreationFlow: () => Promise<void>;
  enterGenericInviteCreationFlow: () => Promise<void>;
  doRegisterPersonal: (registrationData: RegisterData) => Promise<void>;
}

interface State {}

class CreatePersonalAccount extends React.PureComponent<
  Props & ConnectedProps & DispatchProps & InjectedIntlProps,
  State
> {
  componentDidMount() {
    return this.props.enterPersonalCreationFlow();
  }

  createAccount = () => {
    const {account, history, doRegisterPersonal, match} = this.props;
    doRegisterPersonal({...account, invitation_code: match.params.invitationCode})
      .then(() => history.push(ROUTE.CHOOSE_HANDLE))
      .catch(error => console.error('Failed to create personal account from invite', error));
  };

  handleSubmit = () => {
    this.props.history.push(ROUTE.VERIFY);
  };

  render() {
    const {
      isPersonalFlow,
      intl: {formatMessage: _},
    } = this.props;
    const pageContent = (
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
      >
        <H1 center>{_(createPersonalAccountStrings.headLine)}</H1>
        <AccountForm onSubmit={this.handleSubmit} submitText={_(createPersonalAccountStrings.submitButton)} />
      </ContainerXS>
    );
    const backArrow = (
      <Link to={ROUTE.INDEX} component={RRLink} data-uie-name="go-index">
        <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
      </Link>
    );
    return (
      <Page>
        <IsMobile>
          <div style={{margin: 16}}>{backArrow}</div>
        </IsMobile>
        {isPersonalFlow ? (
          <Container centerText verticalCenter style={{width: '100%'}}>
            <Columns>
              <IsMobile not>
                <Column style={{display: 'flex'}}>
                  <div style={{margin: 'auto'}}>{backArrow}</div>
                </Column>
              </IsMobile>
              <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>{pageContent}</Column>
              <Column />
            </Columns>
          </Container>
        ) : (
          pageContent
        )}
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      (state: RootState): ConnectedProps => ({
        account: AuthSelector.getAccount(state),
        currentFlow: AuthSelector.getCurrentFlow(state),
        isPersonalFlow: AuthSelector.isPersonalFlow(state),
      }),
      (dispatch: ThunkDispatch): DispatchProps => ({
        doRegisterPersonal: (registrationData: RegisterData) => {
          return dispatch(ROOT_ACTIONS.authAction.doRegisterPersonal(registrationData));
        },
        enterGenericInviteCreationFlow: () => dispatch(ROOT_ACTIONS.authAction.enterGenericInviteCreationFlow()),
        enterPersonalCreationFlow: () => dispatch(ROOT_ACTIONS.authAction.enterPersonalCreationFlow()),
      })
    )(CreatePersonalAccount)
  )
);
