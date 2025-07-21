@NonCPS
def checkWorkflowRun(Map run, String commitHash) {
  final String headSha = run['head_sha']
  if (headSha == commitHash) {
    echo("Found hash ${headSha}")
    final String conclusion = run['conclusion']
    echo("conclusion: ${conclusion}")

    switch (conclusion) {
            case 'success':
        return true
            case 'failure':
        final String url = run['url']
        error("❌ **Build failed for branch '${GIT_BRANCH_WEBAPP}'** See [Github Actions](${url})")
        break
            case 'cancelled':
        final String url = run['url']
        error("⚠️ **Build aborted for branch '${GIT_BRANCH_WEBAPP}'** See [Github Actions](${url})")
        break
    }
  }
  return false
}

pipeline {
    agent {
        node {
      label 'built-in'
        }
    }

    options { disableConcurrentBuilds(abortPrevious: true) }

    environment {
        CREDENTIALS = credentials('GITHUB_TOKEN_WEB')
        // WIRE_BOT_SECRET = credentials('JENKINSBOT_WEBAPP_DEV')
        webappApplicationPath = 'https://wire-webapp-precommit.zinfra.io/'
    }

    stages {
        stage('Wait for GitHub action to finish') {
      when {
        expression { BRANCH_NAME ==~ /PR-[0-9]+/ }
      }
      steps {
        script {
          def commit_hash = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
          def pr_number = BRANCH_NAME.replaceAll(/\D/, '')
          def changeTargetBranch = env.CHANGE_TARGET

          def targetWorkflowUrl
          switch (changeTargetBranch) {
                      case ['dev']:
              targetWorkflowUrl = 'https://api.github.com/repos/wireapp/wire-webapp/actions/workflows/128602012/runs'
              break
                      default:
                        targetWorkflowUrl = 'https://api.github.com/repos/wireapp/wire-webapp/actions/workflows/128602012/runs'
              break
          }

          echo("Wait for github actions to start for ${BRANCH_NAME} against ${changeTargetBranch}")
          final def VALID_STATUSES = ['queued', 'in_progress', 'completed']
          timeout(time: 45, unit: 'MINUTES') {
            waitUntil {
              def output = sh label: 'Get runs', returnStdout: true, script: "curl -s -L -H 'Accept: application/vnd.github+json' -H 'Authorization: Bearer ${CREDENTIALS}' -H 'X-GitHub-Api-Version: 2022-11-28' ${targetWorkflowUrl}"
              def json = readJSON text: output
              if (json['message']) {
                echo('Output: ' + output)
                error('**Trigger script failed:** ' + json['message'])
              }
              def runs = json['workflow_runs']
              echo('Looking for PR-' + pr_number + ' with hash' + commit_hash)
              def matchingRun = runs.find { it['head_sha'] == commit_hash }
              if (matchingRun) {
                echo('Found ' + commit_hash)
                def status = matchingRun['status']
                echo('status: ' + status)
                env.GITHUB_ACTION_URL = matchingRun['url'].replace('api.github.com/repos', 'github.com/')
                return VALID_STATUSES.contains(status)
              }
              false
            }
            sleep(20)
          }
        }
      }
        }
        stage('Check GitHub Action Status') {
          when { expression { BRANCH_NAME ==~ /PR-[0-9]+/ } }
          steps {
            timeout(time: 15, unit: 'MINUTES') {
              script {
                def commit_hash = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                final String apiUrl = 'https://api.github.com/repos/wireapp/wire-webapp/actions/workflows/128602012/runs'
                final String curlCmd = "curl -u \${CREDENTIALS} ${apiUrl}"
                waitUntil {
                  final String output = sh(label: 'Check workflow', returnStdout: true, script: curlCmd)
                  final Object jsonData = readJSON(text: output)
                  final List workflowRuns = jsonData['workflow_runs']
                  echo("Looking for hash ${commit_hash}")

                  return workflowRuns.any { run ->
                    def result = checkWorkflowRun(run, commit_hash)
                    if (run['conclusion'] == 'cancelled') {
                      echo("GitHub Action was cancelled. Ending Jenkins pipeline.")
                      return true
                    }

                    return result
                  }
                }
              }
            }
          }
        }

    stage('Check deployment') {
        steps {
            script {
                def commit_hash = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                String commitMsg = sh(returnStdout: true, script: 'git log -1 --pretty=%B').trim()
                try {
                  // Wait until deployment has finished (20 retries * 30 seconds == 10 minutes)
                  timeout(time: 10, unit: 'MINUTES') {
                    waitUntil {
                      def randomid = sh returnStdout: true, script: 'uuidgen'
                      randomid = randomid.trim()
                      def current_hash = sh returnStdout: true, script: "curl '${webappApplicationPath}commit?v=${randomid}'"
                      current_hash = current_hash.trim()
                      echo('Current version is: ' + current_hash)
                      if (current_hash == commit_hash) {
                        echo('Deployment finished.')
                        return true
                      }
                      env.MESSAGE = 'Current hash still is ' + current_hash + ' and not ' + commit_hash
                      sh "echo '${MESSAGE}' > deployment.log"
                      sleep(30)
                      return false
                    }
                  }
              } catch (e) {
                  def reason = sh returnStdout: true, script: 'cat deployment.log || echo ""'
                  String errorMessage = """❌ **Deployment failed on** ${webappApplicationPath}
                  ${commitMsg}
                  **Reason:** ${e}
                  ${reason}"""
                  // wireSend secret: env.WIRE_BOT_SECRET, message: errorMessage
                }
                def successMessage = """✅ **Deployment successful on** ${webappApplicationPath}
              ${commitMsg}"""
                // wireSend secret: env.WIRE_BOT_SECRET, message: successMessage
            }
        }
    }
  }
}