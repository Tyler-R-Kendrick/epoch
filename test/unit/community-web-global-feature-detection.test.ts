import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The rule behind the Prompt API fix, applied to every optional global.
 *
 * `community-web-app-language-model-absence.test.ts` pins the two
 * `LanguageModel` guards by name. This pins the shape they are an instance of,
 * because the defect was never really about `LanguageModel`: a feature check
 * written as a bare identifier throws a ReferenceError when the feature is
 * absent, which is precisely the case it was written to handle, and in a
 * classic script that takes the rest of the file with it.
 *
 * Two other probes had the same shape and the same silence — `ResizeObserver`
 * in `gridroad.js`, whose `else` branch proves a fallback was intended and
 * never reachable, and `URL` in `ascii.js`. Naming each one as it is found does
 * not converge, so the rule is enforced across the directory instead.
 */

const APP = join(process.cwd(), "packages/Epoch.Community.Web/app");

type ScriptValue = boolean | null | number | string | ScriptDictionary | ScriptFunction | readonly ScriptValue[] | undefined;
type ScriptFunction = (...args: never[]) => ScriptValue | void;
interface ScriptDictionary {
  [key: string]: ScriptValue;
}

interface ResilienceApi {
  openSession(options: ScriptDictionary): Promise<ScriptValue>;
}

function isResilienceApi(value: ScriptValue): value is ScriptDictionary & ResilienceApi {
  if (value === null || Object(value) !== value) return false;
  return globalThis.Object.prototype.hasOwnProperty.call(value, "openSession");
}

function ensureValueKind(): void {
  // Classic app scripts classify through globalThis.CW_VALUE (value-kind.js).
  // SAFETY: CW_VALUE is installed by value-kind.js onto globalThis in browsers and tests.
  const host = globalThis as { CW_VALUE?: unknown };
  if (host.CW_VALUE !== undefined) return;
  new globalThis.Function(readFileSync(join(APP, "value-kind.js"), "utf8"))();
}

/**
 * `openSession()` is the only place that reaches for the Prompt API itself, and
 * it is reached through `withRetry`, which inspects the error to decide whether
 * another attempt could help. A ReferenceError there is both unreadable and
 * unclassifiable, so absence has to arrive as a stated reason.
 */
async function openSessionStatesAbsenceInsteadOfThrowingReferenceError(): Promise<void> {
  ensureValueKind();
  const window: ScriptDictionary = { addEventListener: () => undefined };
  new globalThis.Function("window", readFileSync(join(APP, "resilient.js"), "utf8"))(window);

  const resilient = window["CWResilient"];
  assert.ok(isResilienceApi(resilient), "resilient.js must publish window.CWResilient");

  let settled = false;
  let rejection: Error | null = null;
  try {
    await resilient.openSession({ report: () => undefined, initialPrompts: [] });
    settled = true;
  } catch (error) {
    if (error instanceof Error) rejection = error;
  }

  assert.equal(settled, false, "openSession() must not resolve without the Prompt API");
  assert.ok(rejection !== null, "openSession() must reject with an Error without the Prompt API");
  assert.ok(
    !(rejection instanceof ReferenceError),
    `openSession() must reject with a stated reason, not a ReferenceError: ${rejection.message}`
  );
  assert.match(rejection.message, /Prompt API is not available/u);
}

/**
 * Web platform globals are capitalized by convention (`ResizeObserver`,
 * `LanguageModel`, `URL`) and locals in these scripts are camelCase, so a
 * capitalized bare identifier handed to `isUndefined` is an optional global
 * being probed without a qualifier — the defect, wherever it next appears.
 */
function featureChecksAreQualified(): void {
  const pattern = /CW_VALUE\.isUndefined\(\s*(?!globalThis\.|window\.|self\.)([A-Z][A-Za-z0-9_$]*)\s*\)/gu;
  const offenders: string[] = [];

  for (const entry of readdirSync(APP)) {
    if (!entry.endsWith(".js")) continue;
    const source = readFileSync(join(APP, entry), "utf8");
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      offenders.push(`${entry}:${line} probes bare global ${match[1]}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `feature checks must read the global off window — a bare undeclared identifier throws ReferenceError:\n${offenders.join("\n")}`
  );
}

export async function runCommunityWebGlobalFeatureDetectionTests(): Promise<void> {
  await openSessionStatesAbsenceInsteadOfThrowingReferenceError();
  featureChecksAreQualified();
  console.log("Community Web global feature detection tests passed");
}
