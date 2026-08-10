#!/bin/bash
# Idempotent SessionStart hook for Epoch.
#
# SessionStart fires on startup, resume, clear, AND compact -- not just
# startup -- so every step here is a guarded no-op when already satisfied.
# An unconditional `npm ci` would otherwise reinstall ~30 workspaces on every
# mid-session compaction. See docs/ai-automation-strategy.md Finding 6.
#
# Known defect this repairs for the session (not the container image): a
# malformed NODE_OPTIONS value such as
#   ["--import tsx" --max-old-space-size=8192]
# makes every node/npm invocation fail with
#   node: --import tsx is not allowed in NODE_OPTIONS
# even though --import has been valid in NODE_OPTIONS since Node 18.19/20.6.
# The defect is the malformed value (brackets and an embedded quoted run
# parsed as one token), not the flag.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 1. Repair NODE_OPTIONS, but only when it actually fails to parse -- a
# session with a clean environment should not be touched.
probe_file="$(mktemp)"
if ! node -e "process.exit(0)" >"$probe_file" 2>&1; then
  if grep -q "not allowed in NODE_OPTIONS" "$probe_file"; then
    echo "SessionStart: NODE_OPTIONS is malformed (${NODE_OPTIONS:-<unset>}); clearing it for this session." >&2
    if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
      echo "unset NODE_OPTIONS" >>"$CLAUDE_ENV_FILE"
    fi
    unset NODE_OPTIONS
    export NODE_OPTIONS=
  else
    echo "SessionStart: node is failing for a reason other than NODE_OPTIONS; leaving it alone." >&2
    cat "$probe_file" >&2
  fi
fi
rm -f "$probe_file"

# 2. Install only when the toolchain is actually missing. Prefer `npm
# install` over `npm ci` when a tree already exists, since `npm ci` deletes
# node_modules first by design and would throw away a perfectly good cache.
#
# Guard against a Playwright postinstall hang: this environment is
# documented to pre-install Chromium at PLAYWRIGHT_BROWSERS_PATH with
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 set so `npm ci` doesn't re-fetch it, but
# that variable was observed unset in a live session, and the postinstall
# then blocks on a browser download with no visible progress. Set it
# defensively (without clobbering a real override) rather than let every
# future session rediscover the same hang.
install_status=0
if [ ! -x node_modules/.bin/tsgo ]; then
  echo "SessionStart: node_modules/.bin/tsgo missing -- installing dependencies." >&2
  : "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:=1}"
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
  if [ -d node_modules ]; then
    npm install
    install_status=$?
  else
    npm ci
    install_status=$?
  fi
else
  echo "SessionStart: dependencies already installed, skipping install." >&2
fi

# 3. Verify rather than assume. `npm ci`/`npm install` runs the "prepare"
# lifecycle script (scripts/install-hooks.mjs, which wires core.hooksPath to
# .githooks/), and that must complete before anything relies on the
# toolchain or on the git hooks being active.
if [ "$install_status" -ne 0 ]; then
  echo "SessionStart: dependency install exited $install_status -- build-dependent gates (typecheck, build, test) will likely fail until this is investigated manually." >&2
elif [ -x node_modules/.bin/tsgo ]; then
  echo "SessionStart: toolchain ready (node_modules/.bin/tsgo present)." >&2
else
  echo "SessionStart: install reported success but node_modules/.bin/tsgo is still missing -- investigate manually." >&2
fi

exit 0
