#!/usr/bin/env bash
#
# Check changed files with Prettier so formatting failures are clear in CI.
#
set -euo pipefail

BASE_REVISION="${BASE_REF:-main}"
HEAD_REVISION="${HEAD_REF:-HEAD}"
GIT_DIFF_OUTPUT="$(mktemp)"
PRETTIER_OUTPUT="$(mktemp)"
trap 'rm -f "$GIT_DIFF_OUTPUT" "$PRETTIER_OUTPUT"' EXIT

if ! git diff --name-only -z --diff-filter=ACMR --find-renames "$BASE_REVISION" "$HEAD_REVISION" >"$GIT_DIFF_OUTPUT"; then
  echo "::error title=Prettier check failed::Could not compare Git base '${BASE_REVISION}' with head '${HEAD_REVISION}'. Verify both revisions are available."
  exit 1
fi

changedFiles=()

while IFS= read -r -d '' changedFilePath; do
  [[ -f "$changedFilePath" ]] || continue
  changedFiles+=("$changedFilePath")
done < "$GIT_DIFF_OUTPUT"

if ((${#changedFiles[@]} == 0)); then
  echo "No changed files to check with Prettier (base=${BASE_REVISION}, head=${HEAD_REVISION})."
  exit 0
fi

set +e
prettier --list-different --ignore-unknown --ignore-path .prettierignore -- "${changedFiles[@]}" >"$PRETTIER_OUTPUT" 2>&1
PRETTIER_STATUS=$?
set -e

if [[ "$PRETTIER_STATUS" -eq 0 ]]; then
  exit 0
fi

if [[ "$PRETTIER_STATUS" -eq 1 ]]; then
  echo "::error title=Prettier check failed::Changed files are not formatted. Run npx just format to fix them."
  echo ""
  echo "Prettier check failed (base=${BASE_REVISION}, head=${HEAD_REVISION})."
  echo ""
  echo "Unformatted files:"
  cat "$PRETTIER_OUTPUT"
  echo ""

  while IFS= read -r changedFilePath; do
    [[ -f "$changedFilePath" ]] || continue
    if grep -Fqx -- "$changedFilePath" "$PRETTIER_OUTPUT"; then
      echo "::error file=${changedFilePath}::Not formatted with Prettier. Run: npx just format"
    fi
  done < <(printf '%s\n' "${changedFiles[@]}")

  echo "Fix formatting with: npx just format"
  exit 1
fi

echo "::error title=Prettier check failed::Prettier could not check one or more changed files. Review the error below."
echo ""
echo "Prettier failed while checking files changed between base=${BASE_REVISION} and head=${HEAD_REVISION}."
echo "Resolve the reported Prettier error, then rerun: npx just format-check"
echo ""
cat "$PRETTIER_OUTPUT"
exit "$PRETTIER_STATUS"
