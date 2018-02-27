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

import {Container, Header, Footer, Content} from '@wireapp/react-ui-kit/Layout';
import {Form, InputSubmitCombo, Input, RoundIconButton, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {Logo} from '@wireapp/react-ui-kit/Identity';
import {H1, H2, Text, Link, Small} from '@wireapp/react-ui-kit/Text';
import {conversationJoinStrings} from '../../strings';
import {connect} from 'react-redux';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import * as ConversationAction from '../module/action/ConversationAction';
import {injectIntl} from 'react-intl';
import {withRouter} from 'react-router';
import React, {Component} from 'react';

class ConversationJoin extends Component {
  state = {
    enteredName: '',
  };

  componentDidMount() {
    const params = new URLSearchParams(this.props.location.search);
    this.props.doCheckConversationCode(params.get('key'), params.get('code'));
  }

  handleSubmit = () => {};

  render() {
    const {intl: {formatMessage: _}} = this.props;
    const {enteredName, error} = this.state;
    return (
      <Container
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <Header>
          <Logo />
          <Text bold>{_(conversationJoinStrings.headerText)}</Text>
        </Header>
        <Content style={{flex: '1', marginTop: '20px', width: '40%'}}>
          <Container verticalCenter>
            <H1 style={{fontWeight: 500}} color={COLOR.GRAY}>
              {_(conversationJoinStrings.headline)}
              {/* <H1 style={{fontWeight: 500}} color={COLOR.BLACK}>
                {' Wire guest room.'}
              </H1> */}
            </H1>
            <H2>{_(conversationJoinStrings.subhead)}</H2>
            <Form style={{marginTop: 30}}>
              <InputSubmitCombo>
                <Input
                  value={enteredName}
                  innerRef={node => (this.teamNameInput = node)}
                  onChange={event => {
                    this.setState({enteredName: event.target.value});
                  }}
                  placeholder={_(conversationJoinStrings.namePlaceholder)}
                  pattern=".{2,256}"
                  maxLength="256"
                  minLength="2"
                  required
                  autoFocus
                  data-uie-name="enter-name"
                />
                <RoundIconButton
                  disabled={!enteredName}
                  type="submit"
                  formNoValidate
                  onClick={this.handleSubmit}
                  data-uie-name="do-next"
                />
              </InputSubmitCombo>
              <ErrorMessage data-uie-name="error-message">
                {error ? parseValidationErrors(error) : parseError(this.props.error)}
              </ErrorMessage>
            </Form>
          </Container>
        </Content>
        <Footer style={{justifyContent: 'flex-end', marginBottom: '30px'}}>
          <Small block>
            {`${_(conversationJoinStrings.hasAccount)} `}
            <Link href={'/login'} textTransform={'none'} data-uie-name="go-login">
              {_(conversationJoinStrings.loginLink)}
            </Link>
          </Small>
          <Small block>
            {`${_(conversationJoinStrings.acceptTou)} `}
            <Link href={'/terms'} textTransform={'none'} data-uie-name="go-tou">
              {_(conversationJoinStrings.touLink)}
            </Link>
          </Small>
        </Footer>
      </Container>
    );
  }
}

export default withRouter(
  injectIntl(
    connect(
      state => ({
        lala: '',
      }),
      {...ConversationAction}
    )(ConversationJoin)
  )
);
