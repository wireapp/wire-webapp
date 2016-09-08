#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
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

# https://github.com/gruntjs/grunt-contrib-copy

module.exports =
###############################################################################
# Local deployment related
###############################################################################
  dist:
    cwd: '<%= dir.app_ %>'
    dest: '<%= dir.dist %>'
    expand: true
    src: [
      'ext/image/**/*'
      'ext/js/**/*'
      'ext/proto/**/*'
      'audio/**/*'
      'image/**/*'
      'font/**/*'
      'style/*.css'
      'vendors/*'
    ]

  dist_audio:
    cwd: '<%= dir.app_ %>/ext/audio/wire-audio-files'
    dest: '<%= dir.dist %>/audio'
    expand: true
    src: '*'

  dist_favicon:
    cwd: '<%= dir.dist %>/image'
    dest: '<%= dir.dist %>'
    expand: true
    src: 'favicon.ico'

###############################################################################
# Prod/Staging/Edge deployment related
###############################################################################
  deploy:
    cwd: '<%= dir.app_ %>'
    dest: '<%= dir.deploy %>'
    expand: true
    src: [
      'ext/image/**/*'
      'ext/js/**/*'
      'ext/proto/**/*'
      'audio/**/*'
      'image/**/*'
      'font/**/*'
      'style/*.css'
      'vendors/*'
    ]

  deploy_audio:
    cwd: '<%= dir.app_ %>/ext/audio/wire-audio-files'
    dest: '<%= dir.deploy %>/audio'
    expand: true
    src: '*'

  deploy_favicon:
    cwd: '<%= dir.deploy %>/image'
    dest: '<%= dir.deploy %>'
    expand: true
    src: 'favicon.ico'

###############################################################################
# Amazon Web Services related
###############################################################################
  aws:
    cwd: '<%= dir.deploy %>'
    dest: '<%= dir.aws.static %>'
    expand: true
    src: '**/*'

  aws_templates:
    cwd: '<%= dir.aws.static %>/'
    dest: '<%= dir.aws.templates %>'
    expand: true
    src: '**/*.html'
