/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import jQuery from 'jquery';
import ko from 'knockout';

import 'Components/avatar/GroupAvatar';
import 'Components/calling/CallingOverlayContainer';
import 'Components/calling/FullscreenVideoCall';
import 'Components/ConnectRequests';
import 'Components/CopyToClipboard';
import 'Components/Giphy';
import 'Components/HistoryExport';
import 'Components/HistoryImport';
import 'Components/icons';
import 'Components/Image';
import 'Components/InputBar';
import 'Components/MessagesList';
import 'Components/Modals/GroupCreation/GroupCreationModal';
import 'Components/panel/ConversationProtocolDetails/ConversationProtocolDetails';
import 'Components/panel/ServiceDetails';
import 'Components/panel/UserDetails';
import 'Components/SearchInput';
import 'Components/ServiceList';
import 'Components/TitleBar';
import 'Components/toggle/BaseToggle';
import 'Components/toggle/InfoToggle';
import 'Components/UserSearchableList';
import '../Config';

import '../page/AppMain';
import '../page/AppLock';
import '../page/MainContent';
import '../page/RightSidebar';

import 'Util/LocalizerUtil';

import '../localization/Localizer';
import '../view_model/bindings/CommonBindings';
import '../view_model/bindings/ConversationListBindings';
import '../view_model/bindings/MessageListBindings';
import '../view_model/bindings/VideoCallingBindings';
import '../view_model/MainViewModel';

window.amplify = amplify;
// we need to publish jQuery on the window so that knockout can use it
window.jQuery = jQuery;
window.ko = ko;
