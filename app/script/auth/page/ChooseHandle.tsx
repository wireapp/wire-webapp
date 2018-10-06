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

import {ConsentType} from '@wireapp/api-client/dist/commonjs/self/index';
import {
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  Muted,
  RoundIconButton,
  Text,
} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {chooseHandleStrings} from '../../strings';
import AcceptNewsModal from '../component/AcceptNewsModal';
import EXTERNAL_ROUTE from '../externalRoute';
import ROOT_ACTIONS from '../module/action/';
import BackendError from '../module/action/BackendError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import {createSuggestions} from '../util/handleUtil';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLAttributes<ChooseHandle>, RouteComponentProps<{}> {}

interface ConnectedProps {
  hasUnsetMarketingConsent: boolean;
  isFetching: boolean;
  isTeamFlow: boolean;
  name: string;
}

interface DispatchProps {
  doGetConsents: () => Promise<void>;
  checkHandles: (handles: string[]) => Promise<string>;
  setHandle: (handle: string) => Promise<void>;
  doSetConsent: (consentType: ConsentType, value: number) => Promise<void>;
}

interface State {
  error: Error;
  handle: string;
}

class ChooseHandle extends React.PureComponent<Props & ConnectedProps & DispatchProps & InjectedIntlProps, State> {
  state: State = {
    error: null,
    handle: '',
  };

  componentDidMount() {
    const suggestions = createSuggestions(this.props.name);
    this.props.doGetConsents();
    this.props
      .checkHandles(suggestions)
      .then(handle => this.setState({handle}))
      .catch(error => this.setState({error}));
  }

  updateConsent = (consentType: ConsentType, value: number) => this.props.doSetConsent(consentType, value);

  onSetHandle = (event: React.FormEvent) => {
    event.preventDefault();
    this.props
      .setHandle(this.state.handle)
      .then(() => {
        if (this.props.isTeamFlow) {
          this.props.history.push(ROUTE.INITIAL_INVITE);
        } else {
          window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP));
        }
      })
      .catch(error => {
        if (error.label === BackendError.HANDLE_ERRORS.INVALID_HANDLE && this.state.handle.trim().length < 2) {
          error.label = BackendError.HANDLE_ERRORS.HANDLE_TOO_SHORT;
        }
        this.setState({error});
      });
  };

  render() {
    const {
      isFetching,
      intl: {formatMessage: _},
    } = this.props;
    return (
      <Page isAuthenticated>
        <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
          <H1 center>{_(chooseHandleStrings.headline)}</H1>
          <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
          <Form style={{marginTop: 30}} onSubmit={this.onSetHandle}>
            <InputSubmitCombo style={{paddingLeft: 0}}>
              <Text center style={{minWidth: 38}}>
                {'@'}
              </Text>
              <Input
                name="handle"
                placeholder={_(chooseHandleStrings.handlePlaceholder)}
                type="text"
                onChange={event => this.setState({error: null, handle: event.target.value})}
                value={this.state.handle}
                autoFocus
                data-uie-name="enter-handle"
              />
              <RoundIconButton
                disabled={!this.state.handle || isFetching}
                type="submit"
                icon={ICON_NAME.ARROW}
                data-uie-name="do-send-handle"
                formNoValidate
              />
            </InputSubmitCombo>
          </Form>
          <ErrorMessage data-uie-name="error-message">{this.state.error && parseError(this.state.error)}</ErrorMessage>
        </ContainerXS>
         {/* TODO: This needs to either be optional or requires consent support on the BE...
         {!this.props.isFetching &&
          this.props.hasUnsetMarketingConsent && (
            <AcceptNewsModal
              onConfirm={() => this.updateConsent(ConsentType.MARKETING, 1)}
              onDecline={() => this.updateConsent(ConsentType.MARKETING, 0)}
            />
          )}
         */}
      </Page>
    );
  }
}

export default injectIntl(
  withRouter(
    connect(
      (state: RootState): ConnectedProps => {
        return {
          hasUnsetMarketingConsent: SelfSelector.hasUnsetConsent(state, ConsentType.MARKETING) || false,
          isFetching: SelfSelector.isFetching(state),
          isTeamFlow: AuthSelector.isTeamFlow(state),
          name: SelfSelector.getSelfName(state),
        };
      },
      (dispatch: ThunkDispatch): DispatchProps => {
        return {
          checkHandles: (handles: string[]) => dispatch(ROOT_ACTIONS.userAction.checkHandles(handles)),
          doGetConsents: () => dispatch(ROOT_ACTIONS.selfAction.doGetConsents()),
          doSetConsent: (consentType: ConsentType, value: number) =>
            dispatch(ROOT_ACTIONS.selfAction.doSetConsent(consentType, value)),
          setHandle: (handle: string) => dispatch(ROOT_ACTIONS.selfAction.setHandle(handle)),
        };
      }
    )(ChooseHandle)
  )
);
