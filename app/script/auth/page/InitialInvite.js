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
import * as TrackingAction from '../module/action/TrackingAction';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import {inviteStrings} from '../../strings';
import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {InputSubmitCombo, Input, RoundIconButton, Form, ButtonLink, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import {CheckIcon} from '@wireapp/react-ui-kit/Icon';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {COLOR} from '@wireapp/react-ui-kit/Identity';
import {parseError} from '../util/errorUtil';
import * as LanguageSelector from '../module/selector/LanguageSelector';
import * as InviteSelector from '../module/selector/InviteSelector';
import {invite} from '../module/action/InviteAction';
import {fetchSelf} from '../module/action/SelfAction';
import Page from './Page';

class InitialInvite extends React.PureComponent {
  componentDidMount() {
    this.props.fetchSelf();
  }

  onInviteDone = () => {
    const {invites, language} = this.props;
    const nextLocation = `/login?hl=${language}&reason=registration`;
    const invited = Boolean(invites.length);

    return Promise.resolve()
      .then(() => {
        this.props.trackEvent({
          attributes: {invited, invites: invites.length},
          name: TrackingAction.EVENT_NAME.TEAM.FINISHED_INVITE_STEP,
        });
      })
      .then(() => (window.location = nextLocation));
  };

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
      <Text data-uie-name="item-pending-email" fontSize="14px">
        {email}
      </Text>
      <CheckIcon color={COLOR.TEXT} />
    </div>
  );

  render() {
    const {invites, error, intl: {formatMessage: _}, ...connected} = this.props;
    return (
      <Page isAuthenticated>
        <ContainerXS
          centerText
          verticalCenter
          style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
        >
          <div>
            <H1 center>{_(inviteStrings.headline)}</H1>
            <Text>{_(inviteStrings.subhead)}</Text>
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
                  placeholder={_(inviteStrings.emailPlaceholder)}
                  type="email"
                  innerRef={node => (this.emailInput = node)}
                  autoFocus
                  data-uie-name="enter-invite-email"
                />
                <RoundIconButton icon="plane" type="submit" data-uie-name="do-send-invite" />
              </InputSubmitCombo>
            </Form>
            <ErrorMessage data-uie-name="error-message">{parseError(error)}</ErrorMessage>
          </div>
          <div>
            {invites.length ? (
              <ButtonLink style={{margin: '0 auto -16px'}} onClick={this.onInviteDone} data-uie-name="do-next">
                {_(inviteStrings.nextButton)}
              </ButtonLink>
            ) : (
              <Link data-uie-name="do-skip" onClick={this.onInviteDone}>
                {_(inviteStrings.skipForNow)}
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
      ...TrackingAction,
    }
  )(InitialInvite)
);
