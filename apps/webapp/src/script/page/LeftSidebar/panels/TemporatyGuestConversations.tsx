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

import {CallingCell} from 'Components/calling/CallingCell';
import * as Icon from 'Components/icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {Config} from '../../../Config';
import {CallingViewModel} from '../../../view_model/CallingViewModel';
import {ListViewModel} from '../../../view_model/ListViewModel';

type TemporaryGuestConversations = {
  callingViewModel: CallingViewModel;
  listViewModel: ListViewModel;
  selfUser: User;
};

const TemporaryGuestConversations = ({selfUser, listViewModel, callingViewModel}: TemporaryGuestConversations) => {
  const {translate} = useApplicationContext();
  const {expirationIsUrgent, expirationRemainingText} = useKoSubscribableChildren(selfUser, [
    'expirationIsUrgent',
    'expirationRemainingText',
  ]);

  const {activeCalls} = useKoSubscribableChildren(callingViewModel, ['activeCalls']);
  const isAccountCreationEnabled = Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION;
  const openPreferences = () => {
    void listViewModel.openPreferencesAccount();
  };

  const createAccount = (): void => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: () => window.location.replace(`/auth/${location.search}`),
        text: translate('modalAccountCreateAction'),
      },
      text: {
        message: translate('modalAccountCreateMessage'),
        title: translate('modalAccountCreateHeadline'),
      },
    });
  };

  return (
    <div id="temporary-guest" className={`temporary-guest`}>
      {activeCalls.map(call => {
        const {conversation} = call;
        return (
          <CallingCell
            key={conversation.id}
            data-uie-name="item-call"
            data-uie-uid={conversation.id}
            data-uie-value={conversation.display_name()}
            call={call}
            isTemporaryUser
            isFullUi
            callActions={callingViewModel.callActions}
            callingRepository={callingViewModel.callingRepository}
            propertiesRepository={callingViewModel.propertiesRepository}
            hasAccessToCamera={callingViewModel.hasAccessToCamera()}
          />
        );
      })}
      <div className="temporary-guest__content">
        <Icon.LogoFullIcon />
        <div className="temporary-guest__description">{translate('temporaryGuestDescription')}</div>
        {isAccountCreationEnabled && (
          <button
            type="button"
            className="temporary-guest__create-account"
            onClick={createAccount}
            data-uie-name="do-create-account"
          >
            {translate('temporaryGuestCta')}
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
          <span>{translate('temporaryGuestTimeRemaining')}</span>
        </span>
        <button
          type="button"
          title={translate('tooltipConversationsPreferences')}
          className="temporary-guest__footer__preferences"
          data-uie-name="go-preferences"
          onClick={openPreferences}
        >
          <Icon.SettingsIcon />
        </button>
      </div>
    </div>
  );
};

export {TemporaryGuestConversations};
