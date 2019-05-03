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

import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';

import {resolve, graph} from '../../config/appResolver';

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
    createViewModel: function({user, onFieldsLoaded = () => {}}, {element}) {
      this.richProfileRepository = resolve(graph.RichProfileRepository);
      this.fields = ko.observable([]);
      ko.computed(
        () => {
          if (user()) {
            const fields = user().email() ? [{type: t('userProfileEmail'), value: user().email()}] : [];
            this.richProfileRepository
              .getUserRichProfile(ko.unwrap(user).id)
              .then(richProfile => {
                if (richProfile.fields) {
                  fields.push(...richProfile.fields);
                }
              })
              .catch(() => {})
              .finally(() => {
                this.fields(fields);
                onFieldsLoaded(this.fields());
              });
          } else {
            this.fields([]);
          }
        },
        this,
        {disposeWhenNodeIsRemoved: element}
      );
      return this;
    },
  },
});
