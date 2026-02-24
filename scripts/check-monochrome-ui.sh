#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGETS=(app components)

echo "Checking for gradient usage in UI sources..."
if rg -n "bg-gradient|linear-gradient|radial-gradient|conic-gradient" "${TARGETS[@]}" --glob '!**/*.md'; then
  echo
  echo "Gradient styles are not allowed in the monochrome UI system."
  exit 1
fi

echo "Checking for bright color utility classes in UI sources..."
COLOR_CLASS_PATTERN='\\b(from|via|to|bg|text|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-[0-9]{2,3})?(/[0-9]{1,3})?\\b'
if rg -n "$COLOR_CLASS_PATTERN" "${TARGETS[@]}" --glob '!**/*.md'; then
  echo
  echo "Bright color utility classes are not allowed in the monochrome UI system."
  exit 1
fi

echo "Monochrome UI style checks passed."
