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

###############################################################################
# Extract script sources
###############################################################################
module.exports = (grunt) ->

  extract_sources = (source_file) ->
    scripts = grunt.file.read source_file
    script_files = []

    # parse app scripts
    lines = scripts.split '\n'
    for line in lines
      match = line.match /src="(.*?)"/
      if match
        script_files.push "deploy#{match[1]}"

    grunt.log.ok "Processed #{source_file}."

    return script_files

  grunt.registerTask 'scripts', ->
    dist_path = grunt.config 'dir.app.template_dist'

    grunt.config 'scripts',
      app: extract_sources "#{dist_path}/app.htm"
      auth_page: extract_sources "#{dist_path}/auth.htm"
      component: extract_sources "#{dist_path}/component.htm"
      vendor: extract_sources "#{dist_path}/vendor.htm"
