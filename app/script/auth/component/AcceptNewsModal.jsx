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

import React from 'react';
import {injectIntl, FormattedHTMLMessage} from 'react-intl';
import {acceptNewsModalStrings} from '../../strings';
import EXTERNAL_ROUTE from '../externalRoute';
import {Link, H3, Button, Container, Columns, Column, Modal, Text, COLOR} from '@wireapp/react-ui-kit';

const AcceptNewsModal = ({onConfirm, onDecline, intl: {formatMessage: _}}) => (
  <Modal>
    <Container style={{maxWidth: '400px'}} data-uie-name="accept-news-modal">
      <H3 style={{fontWeight: '500', marginTop: '10px'}} data-uie-name="accept-news-modal-title">
        {_(acceptNewsModalStrings.headline)}
      </H3>
      <div data-uie-name="accept-news-modal-description">
        <Text block>{_(acceptNewsModalStrings.unsubscribeDescription)}</Text>
        <Link href={EXTERNAL_ROUTE.WIRE_PRIVACY_POLICY} target="_blank" data-uie-name="accept-news-modal-link">
          <Text block>
            <FormattedHTMLMessage {...acceptNewsModalStrings.privacyDescription} />
          </Text>
        </Link>
      </div>
      <Columns style={{margin: '20px 0 10px'}}>
        <Column style={{textAlign: 'center'}}>
          <Button onClick={onDecline} backgroundColor={COLOR.GRAY} data-uie-name="decline-news-button">
            {_(acceptNewsModalStrings.declineButton)}
          </Button>
        </Column>
        <Column style={{textAlign: 'center'}}>
          <Button onClick={onConfirm} data-uie-name="confirm-news-button">
            {_(acceptNewsModalStrings.confirmButton)}
          </Button>
        </Column>
      </Columns>
    </Container>
  </Modal>
);

export default injectIntl(AcceptNewsModal);
