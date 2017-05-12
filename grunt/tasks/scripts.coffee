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

  extract_sources = (source_file, target) ->
    scripts = grunt.file.read source_file
    script_files = []

    # parse app scripts
    lines = scripts.split '\n'
    for line in lines
      has_source = line.match /src="(.*?)"/
      is_comment = line.match /<!--[\s\S]*?-->/
      if has_source and not is_comment
        source = has_source[1]
        # sodium hotfix until this issue gets resolved: https://github.com/jedisct1/libsodium.js/issues/90
        if (not source.endsWith 'sodium.min.js') and (source.endsWith '.min.js')
          current_files = grunt.config 'scripts_minified'
          current_files[target].push "deploy#{source}"
          grunt.config 'scripts_minified', current_files
          grunt.log.writeln "Minified script '#{source}' for target '#{target}' will not get uglified."
        else
          current_files = grunt.config 'scripts'
          current_files[target].push "deploy#{source}"
          grunt.config 'scripts', current_files

    grunt.log.ok "Processed files from '#{source_file}'."

    return script_files

  grunt.registerTask 'scripts', ->
    dist_path = grunt.config 'dir.app.template_dist'

    directories =
      app: []
      auth: []
      component: []
      vendor: []

    grunt.config 'scripts', directories
    grunt.config 'scripts_minified', directories

    for directory_name of directories
      extract_sources "#{dist_path}/#{directory_name}.htm", directory_name
