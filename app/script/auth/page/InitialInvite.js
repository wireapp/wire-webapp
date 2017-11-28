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
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {InputSubmitCombo, Input, RoundIconButton, Form, ButtonLink} from '@wireapp/react-ui-kit/Form';
import {CheckIcon} from '@wireapp/react-ui-kit/Icon';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import * as InviteSelector from '../module/selector/InviteSelector';
import {invite} from '../module/action/InviteAction';
import {fetchSelf} from '../module/action/SelfAction';
import Page from './Page';

class InitialInvite extends React.PureComponent {
  componentDidMount() {
    this.props.fetchSelf();
  }

  renderEmail = email => (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        margin: '17px auto',
        padding: '0 24px 0 20px',
      }}
    >
      <Text fontSize="14px">{email}</Text>
      <CheckIcon color={COLOR.TEXT} />
    </div>
  );

  render() {
    const {invites, language, ...connected} = this.props;
    const nextLocation = `/login?hl=${language}&reason=registration`;
    return (
      <Page isAuthenticated>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
        >
          <div>
            <H1 center>{'Build your team'}</H1>
            <Text>{'Invite your colleagues to join.'}</Text>
          </div>
          <div style={{margin: '18px 0'}}>
            {invites.map(({email}) => this.renderEmail(email))}
            <Form
              onSubmit={event => {
                event.preventDefault();
                connected.invite({email: this.emailInput.value});
                this.emailInput.value = '';
                this.emailInput.focus();
              }}
            >
              <InputSubmitCombo>
                <Input
                  name="email"
                  placeholder={'colleague@email.com'}
                  type="email"
                  innerRef={node => (this.emailInput = node)}
                  autoFocus
                  data-uie-name="enter-invite-email"
                />
                <RoundIconButton icon="plane" type="submit" data-uie-name="do-send-invite" />
              </InputSubmitCombo>
            </Form>
          </div>
          <div>
            {invites.length ? (
              <ButtonLink href={nextLocation} style={{margin: '0 auto -16px'}} data-uie-name="do-next">
                Next
              </ButtonLink>
            ) : (
              <Link href={nextLocation} data-uie-name="do-skip">
                Skip for now
              </Link>
            )}
          </div>
        </ContainerXS>
      </Page>
    );
  }
}

export default injectIntl(
  connect(
    state => ({
      error: InviteSelector.getError(state),
      invites: InviteSelector.getInvites(state),
      language: LanguageSelector.getLanguage(state),
    }),
    {
      fetchSelf,
      invite,
    }
  )(InitialInvite)
);
