#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# https://github.com/gruntjs/grunt-contrib-watch

module.exports =
  options:
    livereload: 32123

  less:
    files: '<%= dir.app_ %>/**/*.less'
    tasks: ['less:dist', 'postcss']

  coffee:
    options:
      spawn: false
    files: ['<%= dir.app_ %>/**/*.coffee', 'sw.coffee']
    tasks: ['coffee:dist']

  js:
    files: '<%= dir.app_ %>/**/*.js'
    tasks: ['copy:dist_js']

  templates:
    files: '<%= dir.app_ %>/**/*.htm*'
    tasks: ['prepare_template']

  test:
    files: '<%= dir.test_ %>/**/*.coffee'
    tasks: ['coffee:test', 'karma']

  test_js:
    files: '<%= dir.test_ %>/**/*.js'
    tasks: ['copy:test', 'karma']
