/**
 * On-device model absence must degrade, not throw.
 *
 * Both call sites guard with `CW_VALUE.isUndefined(...)` so a browser without
 * Chrome's Prompt API gets a written explanation instead of a broken panel.
 * Naming the bare `LanguageModel` global inside that guard defeats it: the
 * argument is evaluated before the call, so on a browser with no such binding
 * the guard itself throws a ReferenceError. That shipped, and CI could not see
 * it because CI drives real Google Chrome, which has the API.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");

interface ResilientApi {
  readonly availability: () => Promise<string>;
}

/** A window the script is evaluated against; it publishes CWResilient. */
interface PromptApiSandbox {
  CWResilient?: ResilientApi;
}

/** What a Prompt-API guard is handed: the global when present, undefined when not. */
type PromptApiBinding = { readonly availability?: () => Promise<string> } | undefined;

/** Stands in for CW_VALUE.isUndefined at the guard's call site. */
function isPromptApiUndefined(value: PromptApiBinding): boolean {
  return value === undefined;
}

function ensureValueKind(): void {
  // Classic app scripts classify through globalThis.CW_VALUE (value-kind.js).
  // SAFETY: CW_VALUE is installed by value-kind.js onto globalThis in browsers and tests.
  const host = globalThis as { CW_VALUE?: unknown };
  if (host.CW_VALUE !== undefined) return;
  new Function(readFileSync(join(APP_ROOT, "value-kind.js"), "utf8"))();
}

/**
 * Evaluates a browser script against a window that has no `LanguageModel`,
 * which is what Firefox, Safari, and any pre-Prompt-API Chromium present.
 */
function loadWithoutPromptApi(file: string): PromptApiSandbox {
  ensureValueKind();
  const sandbox: PromptApiSandbox = {};
  new Function("window", readFileSync(join(APP_ROOT, file), "utf8"))(sandbox);
  return sandbox;
}

/**
 * The zero-mechanism control for the guard: reading the bare global the way
 * the shipped code did throws, which is exactly why the guard must go through
 * `window`.
 */
function bareGlobalReferenceThrows(): void {
  assert.throws(
    () => {
      // The defect's exact shape: an undeclared global passed as an argument.
      // The argument is evaluated before the callee runs, so the guard throws
      // rather than returning the "absent" answer it was written to return.
      new Function("isUndefined", "return isUndefined(CW_ABSENT_PROMPT_API_PROBE)")(
        isPromptApiUndefined,
      );
    },
    ReferenceError,
    "naming an undeclared global must throw, or this guard proves nothing",
  );

  // The same call through `window` answers instead of throwing.
  const guarded = new Function("isUndefined", "window", "return isUndefined(window.LanguageModel)")(
    isPromptApiUndefined,
    {},
  );
  assert.equal(guarded, true, "a window without the Prompt API must report undefined, not throw");
}

async function availabilityReportsAbsentInsteadOfThrowing(): Promise<void> {
  const sandbox = loadWithoutPromptApi("resilient.js");
  const resilient = sandbox.CWResilient;
  assert.ok(resilient, "resilient.js must publish window.CWResilient");
  const state = await resilient.availability();
  assert.equal(state, "absent", "a browser without the Prompt API reports absence");
}

/**
 * `generate.js` guards the same way before writing its paste-the-prompt
 * fallback. Assert on the source rather than driving the DOM: the defect is
 * the shape of the guard's operand, and this is the file's only reachable
 * expression of it outside a browser.
 */
function generatorGuardsThroughWindow(): void {
  const source = readFileSync(join(APP_ROOT, "generate.js"), "utf8");
  assert.match(
    source,
    /isUndefined\(window\.LanguageModel\)/u,
    "generate.js must guard through window.LanguageModel",
  );
  assert.doesNotMatch(
    source,
    /isUndefined\(LanguageModel\)/u,
    "guarding on the bare global throws before it can report the fallback",
  );
}

function resilientGuardsThroughWindow(): void {
  const source = readFileSync(join(APP_ROOT, "resilient.js"), "utf8");
  assert.doesNotMatch(
    source,
    /isUndefined\(LanguageModel\)/u,
    "guarding on the bare global throws before it can report absence",
  );
}

export async function runCommunityWebLanguageModelAbsenceTests(): Promise<void> {
  bareGlobalReferenceThrows();
  await availabilityReportsAbsentInsteadOfThrowing();
  generatorGuardsThroughWindow();
  resilientGuardsThroughWindow();
}
