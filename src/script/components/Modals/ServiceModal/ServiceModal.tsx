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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {renderElement} from 'Util/renderElement';

import {ActionsViewModel} from '../../../view_model/ActionsViewModel';

interface ServiceModalProps {
  readonly service: ServiceEntity;
  readonly integrationRepository: IntegrationRepository;
  readonly actionsViewModel: ActionsViewModel;
  readonly onClose?: () => void;
  readonly avatarSize?: AVATAR_SIZE;
}

const ServiceModal = ({service, avatarSize = AVATAR_SIZE.LARGE, actionsViewModel, onClose}: ServiceModalProps) => {
  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const onOpenService = () => {
    onClose?.();
    setCurrentSidebarTab(SidebarTabs.RECENT);
    actionsViewModel.open1to1ConversationWithService(service);
  };

  const {providerName, name} = useKoSubscribableChildren(service, ['name', 'providerName']);

  return (
    <div className="service-modal" data-uie-name="modal-service">
      <ModalComponent isShown onClosed={onClose} onBgClick={onClose} data-uie-name="group-creation-label">
        {service && (
          <>
            <div className="modal__header">
              <button className="modal__header__button" type="button" onClick={onClose} data-uie-name="do-close">
                <Icon.CloseIcon />
              </button>
            </div>

            <div className="modal__body service-modal__body">
              <div className="service-modal__details">
                <Avatar participant={service} avatarSize={avatarSize} />

                <div className="service-modal__details__content">
                  <h2 className="service-modal__name" data-uie-name="status-service-name">
                    {name}
                  </h2>

                  <div className="service-modal__provider" data-uie-name="status-service-provider">
                    {providerName}
                  </div>
                </div>
              </div>

              <div className="service-modal__description" data-uie-name="status-service-description">
                {service.description}
              </div>
            </div>

            <div className="service-modal__footer">
              <button
                className="service-modal__button modal__button--primary"
                onClick={onOpenService}
                data-uie-name="do-service-confirm"
              >
                {t('searchServiceConfirmButton')}
              </button>
            </div>
          </>
        )}
      </ModalComponent>
    </div>
  );
};

export const showServiceModal = renderElement<ServiceModalProps>(ServiceModal);
