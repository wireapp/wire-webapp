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

module.exports = (grunt) ->
  grunt.registerTask 'log', ->
    pkg = grunt.file.readJSON 'package.json'
    grunt.log.writeln "Deployed: #{pkg.name} (v#{pkg.version})"

  grunt.registerTask 'set_version', (target) ->
    if target
      grunt.option 'target', target
      grunt.log.ok "Version target set to #{grunt.option 'target'}"
    else
      target = grunt.config 'gitinfo.local.branch.current.name'

    user = grunt.config 'gitinfo.local.branch.current.currentUser'
    if user
      user = user.substr(0, user.indexOf ' ').toLowerCase()

    date = new Date()
    month = ('0' + (date.getMonth() + 1)).slice -2
    day = ('0' + date.getDate()).slice -2
    hour = ('0' + date.getHours()).slice -2
    minute = ('0' + date.getMinutes()).slice -2

    version = "#{date.getFullYear()}-#{month}-#{day}-#{hour}-#{minute}"
    if user
      version = "#{version}-#{user}"
    if target
      version = "#{version}-#{target}"

    grunt.option 'version', version
    grunt.log.ok "Version set to #{version}"

  grunt.registerTask 'prepare_dist', [
    'clean:dist'
    'coffee:dist'
    'less:dist'
    'postcss:distribution'
    'copy:dist'
    'copy:dist_audio'
    'copy:dist_favicon'
    'includereplace:dist_index'
    'includereplace:dist_auth'
    'includereplace:dist_demo'
    'clean:dist_app'
  ]

  grunt.registerTask 'prepare_template', [
    'includereplace:dist_index'
    'includereplace:dist_auth'
    'includereplace:dist_demo'
  ]

  grunt.registerTask 'prepare_staging', [
    'clean:deploy'
    'coffeelint:deploy'
    'coffee:deploy'
    'less:deploy'
    'postcss:deploy'
    'copy:deploy'
    'copy:deploy_audio'
    'copy:deploy_favicon'
    'includereplace:deploy_index'
    'includereplace:deploy_auth'
    'includereplace:deploy_demo'
    'clean:deploy_app'
    'uglify:deploy'
    'clean:deploy_script'
  ]

  grunt.registerTask 'prepare_prod', [
    'clean:deploy'
    'coffee:deploy'
    'less:deploy'
    'postcss:deploy'
    'copy:deploy'
    'copy:deploy_audio'
    'copy:deploy_favicon'
    'includereplace:prod_index'
    'includereplace:prod_auth'
    'clean:deploy_app'
    'uglify:deploy'
    'clean:deploy_script'
    'raygun:prod'
    'clean:prod'
  ]

  grunt.registerTask 'prepare_test', [
    'clean:test'
    'copy:test'
    'coffee:test'
  ]

  grunt.registerTask 'check', (file) ->
    grunt.log.writeln '=== ' + grunt.task.current.name.toUpperCase() + ' ==='

    if file isnt undefined
      files = [file]
      grunt.config 'coffeelint.deploy.files.src', files
      grunt.config 'todo.src', files

    grunt.task.run [
      'coffeelint:deploy'
      'todo'
    ]

  grunt.registerTask 'host', (port, open = true) ->
    if port isnt undefined
      grunt.config 'connect.server.port', port
    grunt.task.run 'connect'
    grunt.task.run 'open:dist' if open
    grunt.task.run 'watch'
