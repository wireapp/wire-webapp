/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CallingCell} from 'Components/calling/CallingCell';
import {Icon} from 'Components/Icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../../Config';
import {User} from '../../../entity/User';
import {CallingViewModel} from '../../../view_model/CallingViewModel';
import {ListViewModel} from '../../../view_model/ListViewModel';

type TemporaryGuestConversations = {
  callingViewModel: CallingViewModel;
  listViewModel: ListViewModel;
  selfUser: User;
};

const TemporaryGuestConversations: React.FC<TemporaryGuestConversations> = ({
  selfUser,
  listViewModel,
  callingViewModel,
}) => {
  const {expirationIsUrgent, expirationRemainingText} = useKoSubscribableChildren(selfUser, [
    'expirationIsUrgent',
    'expirationRemainingText',
  ]);

  const {activeCalls} = useKoSubscribableChildren(callingViewModel, ['activeCalls']);
  const isAccountCreationEnabled = Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION;
  const getConversationById = (conversationId: QualifiedId) => callingViewModel.getConversationById(conversationId);
  const openPreferences = () => {
    listViewModel.openPreferencesAccount();
  };

  const createAccount = (): void => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: () => window.location.replace(`/auth/${location.search}`),
        text: t('modalAccountCreateAction'),
      },
      text: {
        message: t('modalAccountCreateMessage'),
        title: t('modalAccountCreateHeadline'),
      },
    });
  };

  return (
    <div id="temporary-guest" className={`temporary-guest`}>
      {activeCalls.map(call => {
        const conversation = getConversationById(call.conversationId);
        return (
          <div key={call.conversationId.id} className="calling-cell">
            <CallingCell
              data-uie-name="item-call"
              data-uie-uid={call.conversationId.id}
              data-uie-value={conversation.display_name()}
              call={call}
              conversation={conversation}
              temporaryUserStyle
              isFullUi
              isSelfVerified={false}
              callActions={callingViewModel.callActions}
              callingRepository={callingViewModel.callingRepository}
              hasAccessToCamera={callingViewModel.hasAccessToCamera()}
              multitasking={callingViewModel.multitasking}
            />
          </div>
        );
      })}
      <div className="temporary-guest__content">
        <Icon.LogoFull />
        <div className="temporary-guest__description">{t('temporaryGuestDescription')}</div>
        {isAccountCreationEnabled && (
          <button
            type="button"
            className="temporary-guest__create-account"
            onClick={createAccount}
            data-uie-name="do-create-account"
          >
            {t('temporaryGuestCta')}
          </button>
        )}
      </div>
      <div className="temporary-guest__footer">
        <span className="temporary-guest__footer__info-text">
          <span
            className={`temporary-guest__footer__info-text__time ${
              expirationIsUrgent ? 'temporary-guest__footer__info-text__time--urgent' : ''
            }`}
            data-uie-name="status-expiration-time"
          >
            {expirationRemainingText}
          </span>
          <span>{t('temporaryGuestTimeRemaining')}</span>
        </span>
        <button
          type="button"
          title={t('tooltipConversationsPreferences')}
          className="temporary-guest__footer__preferences"
          data-uie-name="go-preferences"
          onClick={openPreferences}
        >
          <Icon.Settings />
        </button>
      </div>
    </div>
  );
};

export {TemporaryGuestConversations};
