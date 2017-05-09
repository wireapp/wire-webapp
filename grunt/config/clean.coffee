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

# https://github.com/gruntjs/grunt-contrib-clean

module.exports =
###############################################################################
# Local/Test deployment related
###############################################################################
  dist: '<%= dir.dist %>'
  dist_app: '<%= dir.dist %>/app'
  docs: '<%= dir.docs %>'
  docs_coverage: '<%= dir.docs.coverage %>'
  ext: '<%= dir.app.ext %>/*'
  temp: '<%= dir.temp %>'

###############################################################################
# Production/Staging/Edge deployment related
###############################################################################
  deploy: '<%= dir.deploy %>'
  deploy_app: '<%= dir.deploy %>/app'
  deploy_script: [
    '<%= dir.deploy %>/ext/js'
    '<%= dir.deploy %>/script'
  ]
  prod: [
    '<%= dir.deploy %>/audio/buzzer'
    '<%= dir.deploy %>/audio/digits'
    '<%= dir.deploy %>/image/debug'
    '<%= dir.deploy %>/min/*.map'
  ]

###############################################################################
# Amazon Web Services related
###############################################################################
  aws: '<%= dir.aws.static %>'
  aws_app: '<%= dir.aws.templates %>/app'
  aws_s3: '<%= dir.aws.s3 %>'
