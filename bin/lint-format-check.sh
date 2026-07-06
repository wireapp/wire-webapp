#!/usr/bin/env bash
#
# Wraps `nx format:check` so Prettier failures are obvious in CI and locally.
#
# CI used to run ESLint and Prettier in one "Lint (PR)" step. ESLint output
# flooded the log, and format:check only printed bare file paths before exit 1,
# so GitHub showed nothing useful beyond "Process completed with exit code 1."
#
# This script keeps the same nx check, but on failure prints a clear summary,
# per-file fix commands, and GitHub ::error:: annotations for the Checks UI.
#
set -euo pipefail

BASE="${BASE_REF:-dev}"
HEAD="${HEAD_REF:-HEAD}"

OUTPUT="$(mktemp)"
trap 'rm -f "$OUTPUT"' EXIT

set +e
nx format:check --base="$BASE" --head="$HEAD" >"$OUTPUT" 2>&1
STATUS=$?
set -e

if [[ "$STATUS" -eq 0 ]]; then
  exit 0
fi

echo "::error title=Prettier check failed::One or more files are not formatted. See the job log for paths and fix commands."
echo ""
echo "Prettier check failed (nx format:check --base=${BASE} --head=${HEAD})."
echo ""
echo "Unformatted files:"
cat "$OUTPUT"
echo ""

FILES=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  FILES+=("$file")
  echo "::error file=${file}::Not formatted with Prettier. Run: yarn nx format:write --files=${file}"
done < "$OUTPUT"

if ((${#FILES[@]} > 0)); then
  FILES_CSV=$(IFS=,; echo "${FILES[*]}")
  echo "Fix all at once:"
  echo "  yarn nx format:write --files=${FILES_CSV}"
fi

exit 1
