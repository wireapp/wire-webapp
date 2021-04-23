/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import React from 'react';
import ReactDOM from 'react-dom';

interface ReactWrapperProps {
  component: React.FC;
  componentProps: Object;
}

class ReactWrapper extends React.Component<ReactWrapperProps> {
  component: React.FC;
  constructor(props: ReactWrapperProps) {
    super(props);
    this.component = props.component;
    this.state = props.componentProps;
  }
  render() {
    return React.createElement(this.component, this.state);
  }
}

const reactWrappers = new Map<Comment, ReactWrapper>();

ko.bindingHandlers.react = {
  init(element, valueAccessor, _allBindings, _viewModel, context) {
    if (element.nodeType === Node.COMMENT_NODE) {
      const props = valueAccessor();
      const fragment = document.createDocumentFragment();
      const reactWrapper = React.createElement(ReactWrapper, {
        component: context.$component.reactComponent,
        componentProps: props,
      });
      reactWrappers.set(element, ReactDOM.render(reactWrapper, fragment));
      ko.virtualElements.setDomNodeChildren(element, [fragment]);
      ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
        reactWrappers.delete(element);
      });
    }
    return {controlsDescendantBindings: true};
  },
  update(element, valueAccessor, _allBindings, _viewModel, context) {
    const props = valueAccessor();
    if (reactWrappers.has(element)) {
      reactWrappers.get(element).setState(props);
      return;
    }
    const reactElement = React.createElement(context.$component.reactComponent, props);
    ReactDOM.render(reactElement, element);
  },
};

ko.virtualElements.allowedBindings.react = true;
