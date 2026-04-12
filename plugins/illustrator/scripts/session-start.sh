#!/usr/bin/env bash
# Session-start checks for the illustrator plugin.
# Uses systemMessage for user-visible warnings, additionalContext for Claude awareness.

warnings=""

if [ -z "$HUGEICONS_API_KEY" ]; then
  warnings="${warnings}WARNING: HUGEICONS_API_KEY is not set. Icon search and SVG retrieval will fail. Add 'export HUGEICONS_API_KEY=your-key' to your shell profile.\\n"
fi

if ! grep -q '"frontend-design@claude-plugins-official"' ~/.claude/settings.json 2>/dev/null; then
  warnings="${warnings}WARNING: frontend-design plugin is not installed. The illustrator agent works best with it. Install via /plugin install frontend-design@claude-plugins-official\\n"
fi

if [ -n "$warnings" ]; then
  cat <<EOF
{"systemMessage":"${warnings}","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"${warnings}"}}
EOF
fi

exit 0
