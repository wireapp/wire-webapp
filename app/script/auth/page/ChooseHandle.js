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

import {chooseHandleStrings} from '../../strings';
import {
  H1,
  Text,
  ContainerXS,
  InputSubmitCombo,
  Input,
  RoundIconButton,
  Form,
  ErrorMessage,
} from '@wireapp/react-ui-kit';
import {injectIntl} from 'react-intl';
import {parseError} from '../util/errorUtil';
import EXTERNAL_ROUTE from '../externalRoute';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';
import React from 'react';
import {createSuggestions} from '../util/handleUtil';
import {checkHandles} from '../module/action/UserAction';
import {setHandle, doGetConsents, doSetConsent} from '../module/action/SelfAction';
import {connect} from 'react-redux';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import BackendError from '../module/action/BackendError';
import {ROUTE} from '../route';
import {withRouter} from 'react-router';
import AcceptNewsModal from '../component/AcceptNewsModal';
import {ConsentType} from '@wireapp/api-client/dist/commonjs/self/index';

class ChooseHandle extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      handle: '',
    };
  }

  componentDidMount() {
    const suggestions = createSuggestions(this.props.name);
    this.props
      .doGetConsents()
      .then(() => this.props.checkHandles(suggestions))
      .then(handle => this.setState({handle}))
      .catch(error => this.setState({error}));
  }

  updateConsent = (consentType, value) => this.props.doSetConsent(consentType, value);

  onSetHandle = event => {
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
          <Text center>{_(chooseHandleStrings.subhead)}</Text>
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
                data-uie-name="do-send-handle"
                formNoValidate
              />
            </InputSubmitCombo>
          </Form>
          <ErrorMessage data-uie-name="error-message">{this.state.error && parseError(this.state.error)}</ErrorMessage>
        </ContainerXS>
        {!this.props.isFetching &&
          this.props.hasUnsetMarketingConsent && (
            <AcceptNewsModal
              onConfirm={() => this.updateConsent(ConsentType.MARKETING, 1)}
              onDecline={() => this.updateConsent(ConsentType.MARKETING, 0)}
            />
          )}
      </Page>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        hasUnsetMarketingConsent: SelfSelector.hasUnsetConsent(state, ConsentType.MARKETING) || false,
        isFetching: SelfSelector.isFetching(state),
        isTeamFlow: AuthSelector.isTeamFlow(state),
        name: SelfSelector.getSelfName(state),
      }),
      {
        checkHandles,
        doGetConsents,
        doSetConsent,
        setHandle,
      }
    )(ChooseHandle)
  )
);
