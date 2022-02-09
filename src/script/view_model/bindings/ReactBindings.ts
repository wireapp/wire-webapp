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
    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      // Allow react to clean up after the element is removed from the DOM.
      // This is needed to prevent memory leaks, as it calls all useEffect return functions and such.
      const targetElement = element.nodeType !== Node.COMMENT_NODE ? element : element.parentNode;
      ReactDOM.unmountComponentAtNode(targetElement);
      reactWrappers.delete(element);
    });

    const reactWrapper = React.createElement(ReactWrapper, {
      component: context.$component.reactComponent,
      componentProps: valueAccessor(),
    });

    if (element.nodeType === Node.COMMENT_NODE) {
      const fragment = document.createDocumentFragment();
      reactWrappers.set(element, ReactDOM.render(reactWrapper, fragment));
      ko.virtualElements.setDomNodeChildren(element, [fragment]);
    } else {
      reactWrappers.set(element, ReactDOM.render(reactWrapper, element));
    }
    return {controlsDescendantBindings: true};
  },
  update(element, valueAccessor) {
    reactWrappers.get(element)?.setState(valueAccessor());
  },
};

ko.virtualElements.allowedBindings.react = true;
