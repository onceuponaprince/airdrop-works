#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="${1:?Usage: score_rubric_local.sh <rubric_key> <text>}"
TEXT="${2:?Usage: score_rubric_local.sh <rubric_key> <text>}"
RUBRIC_FILE="$ROOT/schemas/rubric/v1/rubrics/${KEY}.json"

if [[ ! -f "$RUBRIC_FILE" ]]; then
  echo "Rubric file not found: $RUBRIC_FILE" >&2
  exit 1
fi

python3 "$ROOT/tools/rubric-eval/evaluate.py" --rubric "$RUBRIC_FILE" --text "$TEXT"
