#!/usr/bin/env bash
#
# This scripts determines the latest published release or prelease version
# of the webapp helm chart returns a semver bump of it on stdout.
#
# If the version in the helm chart source in ./charts/webapp/Chart.yaml
# is greater than the published version it is used in place of the latest
# published version.
#
# Usage: ./bin/chart-next-version.sh <prerelease|release>

set -eo pipefail

readonly bump_type=${1:?"Please specify bump type \"prerelease\" or \"release\""}

# search latest version in helm repo
if [ "$bump_type" = "prerelease" ]; then
  search_args="--devel"
else
  if [ "$bump_type" = "release" ]; then
    search_args=""
  else
    echo 1>&2 "Unknown bump_type $bump_type provided"
    exit 1
  fi
fi
res=$(helm search repo charts-webapp/webapp $search_args)
if [ "$res" == "No results found" ]; then
  echo 1>&2 "Unexpected: no charts found"
  exit 1
else
  version_latest=$(sed -nE '2{s/[^ \t]+[ \t]+([^ \t]+).*/\1/p}' <<< "$res")
  if [ "$(./bin/semver validate "$version_latest")" != "valid" ]; then
    echo 1>&2 "Could not determine version"
    exit 1
  fi
fi

# is hardcoded bigger? if yes then use it instead
version_src=$(yq -Mr '.version' ./charts/webapp/Chart.yaml)
if [ "$(./bin/semver compare "$version_src" "$version_latest")" = "1" ]; then
  echo 1>&2 "Harcoded version $version_src is newer than $version_latest, so using $version_src"
  version_latest="$version_src"
fi

echo 1>&2 "version_latest: $version_latest"

if [ "$bump_type" = "prerelease" ]; then
  if [ "$(./bin/semver get prerelease "$version_latest")" = "" ]; then
    # this is first prelease
    # we initialize pre-release counter to 100000 instead of 0
    # so that prereleases are lexicographically ordered.
    # That way helm search always shows the latest version by default.
    version_new=$(./bin/semver bump prerelease pre100000 "$version_latest")
  else
    version_new=$(./bin/semver bump prerelease "$version_latest")
  fi
else
  version_new=$(./bin/semver bump minor "$version_latest")
fi

echo "$version_new"
