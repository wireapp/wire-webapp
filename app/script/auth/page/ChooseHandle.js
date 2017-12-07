/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {chooseHandleStrings} from '../../strings';
import {InputSubmitCombo, Input, RoundIconButton, Form, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {H1, Text} from '@wireapp/react-ui-kit/Text';
import {injectIntl} from 'react-intl';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import {pathWithParams} from '../util/urlUtil';

import Page from './Page';
import React from 'react';
import {createSuggestions} from '../util/handleUtil';
import {checkHandles} from '../module/action/UserAction';
import {setHandle} from '../module/action/SelfAction';
import {connect} from 'react-redux';
import * as SelfSelector from '../module/selector/SelfSelector';

class ChooseHandle extends React.PureComponent {
  state = {
    error: null,
    handle: '',
  };

  componentDidMount() {
    const suggestions = createSuggestions(this.props.name);
    this.props
      .checkHandles(suggestions)
      .then(handle => this.setState({handle}))
      .catch(error => this.setState({error: error.response.message}));
  }

  onSetHandle = event => {
    event.preventDefault();
    this.props
      .setHandle(this.state.data.handle)
      .then(() => (window.location = pathWithParams('/login', 'reason=registration')));
  };

  render() {
    const {error, intl: {formatMessage: _}} = this.props;
    return (
      <Page>
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
                onChange={event => this.setState({handle: event.target.value})}
                value={this.state.handle}
                autoFocus
                data-uie-name="enter-invite-email"
              />
              <RoundIconButton
                disabled={this.state.handle.length < 2}
                type="submit"
                data-uie-name="do-send-invite"
                formNoValidate
              />
            </InputSubmitCombo>
          </Form>
          <ErrorMessage data-uie-name="error-message">
            {this.state.error ? parseValidationErrors(this.state.error) : parseError(error)}
          </ErrorMessage>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(
  connect(
    state => ({
      error: SelfSelector.getSelfError(state),
      name: SelfSelector.getSelfName(state),
    }),
    {
      checkHandles,
      setHandle,
    }
  )(ChooseHandle)
);
