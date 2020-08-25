/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

// http://stackoverflow.com/questions/28762211/unable-to-mute-html5-video-tag-in-firefox
ko.bindingHandlers.muteMediaElement = {
  update(element: HTMLMediaElement, valueAccessor: ko.Observable<MediaStream>) {
    if (valueAccessor()) {
      element.muted = true;
    }
  },
};

ko.bindingHandlers.sourceStream = {
  update(element: HTMLMediaElement, valueAccessor: ko.Observable<MediaStream>) {
    const stream = valueAccessor();
    if (stream) {
      element.srcObject = stream;
    }
  },
};
