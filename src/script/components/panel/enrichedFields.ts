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

import {RichInfoField} from '@wireapp/api-client/dist/user/RichInfo';
import ko from 'knockout';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

import {User} from '../../entity/User';
import {APIClientSingleton} from '../../service/APIClientSingleton';
import {RichProfileRepository} from '../../user/RichProfileRepository';

interface ComponentParams {
  user: ko.Observable<User>;
  onFieldsLoaded: (richFields: RichInfoField[]) => void;
  richProfileRepository: RichProfileRepository;
}

class EnrichedFields {
  readonly fields: ko.Observable<RichInfoField[]>;
  readonly richProfileRepository: RichProfileRepository;

  constructor(params: ComponentParams, element: Node) {
    const {
      user,
      onFieldsLoaded = noop,
      richProfileRepository = new RichProfileRepository(container.resolve(APIClientSingleton).getClient()),
    } = params;
    this.richProfileRepository = richProfileRepository;
    this.fields = ko.observable([]);
    ko.computed(
      () => {
        if (user()) {
          const fields: RichInfoField[] = user().email() ? [{type: t('userProfileEmail'), value: user().email()}] : [];
          this.richProfileRepository
            .getUserRichProfile(ko.unwrap(user).id)
            .then(richProfile => {
              if (richProfile.fields) {
                fields.push(...richProfile.fields);
              }
            })
            .catch(noop)
            .finally(() => {
              this.fields(fields);
              onFieldsLoaded(this.fields());
            });
        } else {
          this.fields([]);
        }
      },
      this,
      {disposeWhenNodeIsRemoved: element},
    );
  }
}

ko.components.register('enriched-fields', {
  template: `
    <!-- ko if: fields() -->
      <div class="enriched-fields">
        <!-- ko foreach: {data: fields(), as: 'field'} -->
          <div class="enriched-fields__entry">
            <div data-bind="text: field.type" class="enriched-fields__entry__key" data-uie-name="item-enriched-key"></div>
            <div data-bind="text: field.value" class="enriched-fields__entry__value" data-uie-name="item-enriched-value"></div>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel: (params: ComponentParams, componentInfo: {element: Node}) =>
      new EnrichedFields(params, componentInfo.element),
  },
});
