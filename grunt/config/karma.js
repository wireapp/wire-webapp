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

'use strict';

// https://github.com/karma-runner/grunt-karma

module.exports = {
  options: {
    configFile: 'karma.conf.js',
    files: [
      {included: false, nocache: true, pattern: 'ext/proto/generic-message-proto/messages.proto', served: true},
      {included: false, nocache: false, pattern: 'audio/*.mp3', served: true},
      {included: false, nocache: true, pattern: 'worker/*.js', served: true},
      // helper files
      '../node_modules/jasmine-ajax/lib/mock-ajax.js',
      '../node_modules/sinon/pkg/sinon.js',
      '../test/api/environment.js',
      '../test/api/payloads.js',
      '../test/api/SDP_payloads.js',
      '../test/api/TestFactory.js',
      '../test/api/OpenGraphMocks.js',
      '../test/js/calling/CallRequestResponseMock.js',
    ],
    proxies: {
      '/audio/': '/base/audio/',
      '/ext/': '/base/ext/',
      '/worker/': '/base/worker/',
    },
  },
  test: {
    colors: false,
  },
};
