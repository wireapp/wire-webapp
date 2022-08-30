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

import {MainViewModel} from '../../../view_model/MainViewModel';
import {Router} from '../../../router/Router';
import {initRouterBindings} from '../../../router/routerBindings';
import {container} from 'tsyringe';
import showUserModal from 'Components/Modals/UserModal';
import AppLock from '../../../page/AppLock';
import {WarningsContainer} from '../../../view_model/WarningsContainer';

const html = require('./template/wire-main.htm');
interface WireAppProps {
  repositories: any;
}

export const WireApp: React.FC<WireAppProps> = ({repositories}) => {
  const initKoApp = (appContainer: HTMLDivElement) => {
    const mainView = new MainViewModel(repositories);
    mainView.render(appContainer);

    repositories.notification.setContentViewModelStates(mainView.content.state, mainView.multitasking);

    const conversationEntity = repositories.conversation.getMostRecentConversation();

    if (repositories.user['userState'].isTemporaryGuest()) {
      mainView.list.showTemporaryGuest();
    } else if (conversationEntity) {
      mainView.content.showConversation(conversationEntity, {});
    } else if (repositories.user['userState'].connectRequests().length) {
      //amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    const redirect = false; // localStorage.getItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);
    if (redirect) {
      ///localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);
      window.location.replace(redirect);
    }

    const conversationRedirect = false; // localStorage.getItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);
    if (conversationRedirect) {
      const {conversation, domain} = JSON.parse(conversationRedirect)?.data;
      //localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);
      window.location.replace(`#/conversation/${conversation}${domain ? `/${domain}` : ''}`);
    }

    const router = new Router({
      '/conversation/:conversationId(/:domain)': (
        conversationId: string,
        domain: string = /*this.apiClient.context?.domain ??*/ '',
      ) => mainView.content.showConversation(conversationId, {}, domain),
      '/preferences/about': () => mainView.list.openPreferencesAbout(),
      '/preferences/account': () => mainView.list.openPreferencesAccount(),
      '/preferences/av': () => mainView.list.openPreferencesAudioVideo(),
      '/preferences/devices': () => mainView.list.openPreferencesDevices(),
      '/preferences/options': () => mainView.list.openPreferencesOptions(),
      '/user/:userId(/:domain)': (userId: string, domain: string = /*this.apiClient.context?.domain ??*/ '') => {
        showUserModal({
          actionsViewModel: mainView.actions,
          onClose: () => router.navigate('/'),
          userId: {domain, id: userId},
          userRepository: repositories.user,
        });
      },
    });
    initRouterBindings(router);
    container.registerInstance(Router, router);

    repositories.properties.checkPrivacyPermission().then(() => {
      //window.setTimeout(() => repositories.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  };
  return (
    <main className="TODO">
      <div className="app" dangerouslySetInnerHTML={{__html: html()}} ref={initKoApp} />
      <AppLock clientRepository={repositories.client} />
      <WarningsContainer />
      {/*<CallingContainer
        callingRepository={repositories.calling}
        mediaRepository={repositories.media}
        multitasking={{} as any}
  />*/}
    </main>
  );
};
