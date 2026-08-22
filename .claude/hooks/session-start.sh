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

# 2. Install only when the toolchain is actually missing.
#
# The probe covers every binary the gate ladder shells out to, not just one.
# A single-binary probe (this hook checked only tsgo) reports "already
# installed" for a tree that is merely partly installed: a live session was
# observed with tsgo present but `oxlint` absent entirely and `@eslint/js`
# missing its entry point, so `npm run lint` and `npm run lint:oxlint` both
# failed while the hook reported the toolchain ready. Anything a gate invokes
# by name belongs in this list.
#
# Guard against a Playwright postinstall hang: this environment is
# documented to pre-install Chromium at PLAYWRIGHT_BROWSERS_PATH with
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 set so `npm ci` doesn't re-fetch it, but
# that variable was observed unset in a live session, and the postinstall
# then blocks on a browser download with no visible progress. Set it
# defensively (without clobbering a real override) rather than let every
# future session rediscover the same hang.
required_bins="tsgo oxlint eslint konsistent"

missing_bins() {
  local found=""
  local bin
  for bin in $required_bins; do
    if [ ! -x "node_modules/.bin/$bin" ]; then
      found="$found $bin"
    fi
  done
  # SAFETY: word-splitting is the intended contract here; the caller tests
  # this for emptiness and prints it as a list.
  echo "${found# }"
}

install_status=0
missing="$(missing_bins)"
if [ -n "$missing" ]; then
  echo "SessionStart: missing from node_modules/.bin: $missing -- installing dependencies." >&2
  : "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:=1}"
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
  if [ -d node_modules ]; then
    # Prefer `npm install` over `npm ci` when a tree already exists, since
    # `npm ci` deletes node_modules first by design and would throw away a
    # perfectly good cache. But a half-written tree makes `npm install` fail
    # with ENOTEMPTY while renaming a package it cannot replace, and no
    # amount of retrying repairs that -- only a clean tree does. So fall
    # through to `npm ci` rather than leaving the session unlintable.
    npm install
    install_status=$?
    if [ "$install_status" -ne 0 ]; then
      echo "SessionStart: npm install exited $install_status (a corrupt tree cannot be repaired in place) -- retrying with npm ci." >&2
      npm ci
      install_status=$?
    fi
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
missing="$(missing_bins)"
if [ "$install_status" -ne 0 ]; then
  echo "SessionStart: dependency install exited $install_status -- gates will likely fail until this is investigated manually." >&2
elif [ -z "$missing" ]; then
  echo "SessionStart: toolchain ready ($required_bins present in node_modules/.bin)." >&2
else
  echo "SessionStart: install reported success but these are still missing: $missing -- investigate manually." >&2
fi

# Wire the git hooks directly rather than trusting that "prepare" ran. A
# session was observed with core.hooksPath unset because its install was
# skipped as already-satisfied, and another where `npm ci` stalled in a later
# postinstall before reaching "prepare" -- in both the pre-commit and
# pre-push gates were silently inactive, which is the failure mode the gates
# exist to prevent. scripts/install-hooks.mjs is idempotent and fail-open, so
# calling it when the config is missing costs nothing when it is already set.
if [ -d .githooks ] && [ -z "$(git config core.hooksPath 2>/dev/null)" ]; then
  echo "SessionStart: core.hooksPath is unset -- wiring .githooks." >&2
  node scripts/install-hooks.mjs >/dev/null 2>&1
  if [ -n "$(git config core.hooksPath 2>/dev/null)" ]; then
    echo "SessionStart: git hooks wired (core.hooksPath=$(git config core.hooksPath))." >&2
  else
    echo "SessionStart: could not wire core.hooksPath -- pre-commit and pre-push gates will not run locally." >&2
  fi
fi

exit 0
