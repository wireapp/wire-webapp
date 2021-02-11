/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {container, InjectionToken} from 'tsyringe';

export function registerReactComponent<Props>(
  name: string,
  {
    template,
    component,
    optionalParams = [],
    injected = {},
  }: {
    component: React.ComponentType<Props>;
    injected?: Record<string, InjectionToken>;
    /** The optional knockout params */
    optionalParams?: (keyof Props)[];
    template: string;
  },
) {
  ko.components.register(name, {
    template,
    viewModel: function (knockoutParams: Props) {
      optionalParams.forEach(param => {
        if (!knockoutParams.hasOwnProperty(param)) {
          knockoutParams[param] = null;
        }
      });
      Object.entries(injected).forEach(([injectedName, injectedClass]) => {
        knockoutParams[injectedName as keyof Props] = container.resolve(injectedClass);
      });
      Object.assign(this, knockoutParams);
      this.reactComponent = component;
    },
  });
}
