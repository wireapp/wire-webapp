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

import {FormattedMessage} from 'react-intl';

import {Button, COLOR, Column, Columns, Container, H3, Link, Modal, Text} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';

interface Props {
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDecline: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const AcceptNewsModal = ({onConfirm, onDecline}: Props) => {
  return (
    <Modal>
      <Container style={{maxWidth: '400px'}} data-uie-name="modal-marketing-consent">
        <H3 style={{fontWeight: 500, marginTop: '10px'}} data-uie-name="modal-marketing-consent-title">
          {t('acceptNewsModal.headline', {brandName: Config.getConfig().BRAND_NAME})}
        </H3>
        <div data-uie-name="modal-marketing-consent-description">
          <Text block>{t('acceptNewsModal.unsubscribeDescription')}</Text>
          <Link href={Config.getConfig().URL.PRIVACY_POLICY} target="_blank" data-uie-name="go-privacy">
            <Text block>
              <FormattedMessage
                id="acceptNewsModal.privacyDescription"
                values={{
                  strong: (...chunks: any[]) => <strong>{chunks}</strong>,
                }}
              />
            </Text>
          </Link>
        </div>
        <Columns style={{margin: '20px 0 10px'}}>
          <Column style={{textAlign: 'center'}}>
            <Button
              type="button"
              onClick={onDecline}
              backgroundColor={COLOR.GRAY}
              data-uie-name="do-decline-marketing-consent"
            >
              {t('acceptNewsModal.declineButton')}
            </Button>
          </Column>
          <Column style={{textAlign: 'center'}}>
            <Button type="button" onClick={onConfirm} data-uie-name="do-confirm-marketing-consent">
              {t('acceptNewsModal.confirmButton')}
            </Button>
          </Column>
        </Columns>
      </Container>
    </Modal>
  );
};

export {AcceptNewsModal};
