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

import {Button, COLOR, Column, Columns, Container, H3, Link, Modal, Text} from '@wireapp/react-ui-kit';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {Config} from '../../Config';
import {acceptNewsModalStrings} from '../../strings';

export interface Props extends React.HTMLProps<HTMLDivElement> {
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDecline: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const AcceptNewsModal = ({onConfirm, onDecline}: Props) => {
  const {formatMessage: _} = useIntl();
  return (
    <Modal>
      <Container style={{maxWidth: '400px'}} data-uie-name="modal-marketing-consent">
        <H3 style={{fontWeight: 500, marginTop: '10px'}} data-uie-name="modal-marketing-consent-title">
          {_(acceptNewsModalStrings.headline, {brandName: Config.getConfig().BRAND_NAME})}
        </H3>
        <div data-uie-name="modal-marketing-consent-description">
          <Text block>{_(acceptNewsModalStrings.unsubscribeDescription)}</Text>
          <Link href={Config.getConfig().URL.PRIVACY_POLICY} target="_blank" data-uie-name="go-privacy">
            <Text block>
              <FormattedMessage
                {...acceptNewsModalStrings.privacyDescription}
                values={{
                  // eslint-disable-next-line react/display-name
                  strong: (...chunks: any[]) => <strong>{chunks}</strong>,
                }}
              />
            </Text>
          </Link>
        </div>
        <Columns style={{margin: '20px 0 10px'}}>
          <Column style={{textAlign: 'center'}}>
            <Button onClick={onDecline} backgroundColor={COLOR.GRAY} data-uie-name="do-decline-marketing-consent">
              {_(acceptNewsModalStrings.declineButton)}
            </Button>
          </Column>
          <Column style={{textAlign: 'center'}}>
            <Button onClick={onConfirm} data-uie-name="do-confirm-marketing-consent">
              {_(acceptNewsModalStrings.confirmButton)}
            </Button>
          </Column>
        </Columns>
      </Container>
    </Modal>
  );
};

export default AcceptNewsModal;
