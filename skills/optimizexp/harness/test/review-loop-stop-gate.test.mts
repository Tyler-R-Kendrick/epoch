/**
 * Stop / closeout gate tests for optimizexp review-loop.
 * Run: node --import tsx --test .agents/skills/optimizexp/harness/test/review-loop-stop-gate.test.mts
 */
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { JsonObject } from "../lib/value-types.mts";

// harness/test → harness → optimizexp → skills → .agents → repo root
const REPO = path.resolve(
	path.dirname(new URL(import.meta.url).pathname),
	"../../../../..",
);
const RL = path.join(
	REPO,
	".agents/skills/optimizexp/workflows/cross-agent/review-loop.mts",
);

function runRl(
	root: string,
	args: string[],
) {
	const r = spawnSync(
		process.execPath,
		["--import", "tsx", RL, "--root", root, ...args],
		{ cwd: REPO, encoding: "utf8", env: process.env },
	);
	const stdout = r.stdout || "";
	const stderr = r.stderr || "";
	let json: JsonObject = {};
	try {
		// Parse last top-level JSON object via brace balance (stdout only)
		let depth = 0;
		let start = -1;
		let last: string | null = null;
		for (let i = 0; i < stdout.length; i++) {
			const ch = stdout[i]!;
			if (ch === "{") {
				if (depth === 0) start = i;
				depth++;
			} else if (ch === "}") {
				depth--;
				if (depth === 0 && start >= 0) {
					last = stdout.slice(start, i + 1);
					start = -1;
				}
			}
		}
		if (last) json = JSON.parse(last);
	} catch {
		// leave empty; assertions will surface stdout
	}
	return { code: r.status, json, stdout: stdout + stderr };
}

function seedRepo(): string {
	const dir = mkdtempSync(path.join(tmpdir(), "oxp-stop-"));
	mkdirSync(path.join(dir, ".optimizexp", "bus", "entries"), {
		recursive: true,
	});
	mkdirSync(path.join(dir, ".git"), { recursive: true });
	return dir;
}

function writeScores(
	dir: string,
	name: string,
	metric_total: number,
	metric_max: number,
	extra: Record<string, number> = {},
) {
	const p = path.join(dir, name);
	writeFileSync(
		p,
		JSON.stringify({
			iteration: 1,
			cells: [],
			metric_total,
			metric_max,
			...extra,
		}) + "\n",
	);
	return p;
}

function card(phase: "expect" | "act" | "outcome") {
	return {
		schemaVersion: 1,
		phase,
		role: phase === "expect" ? "predicted" : phase === "act" ? "observed" : "judged",
		persona: "dev",
		surface: "cli",
		primary: { harms: 0, friction: 0, uncertainty: 0, total: 0, max: 0 },
		rationale: {},
		evidenceRefs: phase === "expect" ? [] : ["before.txt"],
		scoredAt: new Date().toISOString(),
	};
}

describe("optimizexp stop gate", () => {
	it("init writes infinite-until-pareto-equilibrium and status running", () => {
		const dir = seedRepo();
		try {
			const { code, json } = runRl(dir, [
				"--mode",
				"init",
				"--run",
				"t-init",
				"--experiences",
				"dx",
			]);
			assert.equal(code, 0);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const scope = (json.scope ?? json) as JsonObject;
			// when nested under scope key
			const s =
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(json.scope as JsonObject | undefined) ??
				JSON.parse(
					readFileSync(
						path.join(dir, ".optimizexp/runs/t-init/scope.json"),
						"utf8",
					),
				);
			assert.equal(s.stopPolicy, "infinite-until-pareto-equilibrium");
			assert.equal(s.status, "running");
			assert.equal(s.regime, "harm_reduce");
			assert.ok(existsSync(path.join(dir, ".optimizexp/runs/t-init/INCOMPLETE.md")));
			assert.notEqual(s.stopPolicy, "infinite-until-zero-or-irreducible");
			void scope;
			void code;
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("should-stop plateau is cycleStop not invocationStop", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-ss", "--experiences", "dx"]);
			const prev = writeScores(dir, "prev.json", 3, 2);
			const curr = writeScores(dir, "curr.json", 3, 2);
			const { code, json } = runRl(dir, [
				"--mode",
				"should-stop",
				"--run",
				"t-ss",
				"--iteration",
				"1",
				"--scores",
				curr,
				"--prev-scores",
				prev,
				"--implementable-findings",
				"0",
			]);
			assert.equal(code, 0);
			assert.equal(json.cycleStop, true);
			assert.equal(json.invocationStop, false);
			assert.equal(json.reason, "harm-floor-switch-to-delight");
			assert.equal(json.nextRegime, "delight_maximize");
			const scope = JSON.parse(
				readFileSync(path.join(dir, ".optimizexp/runs/t-ss/scope.json"), "utf8"),
			);
			assert.equal(scope.regime, "delight_maximize");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("copied scores from baseline fail without justification", () => {
		const dir = seedRepo();
		const run = "t-copied";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "dx"]);
			const runDir = path.join(dir, ".optimizexp/runs", run);
			const payload = {
				iteration: 0,
				cells: [
					{
						persona: "dev",
						surface: "cli",
						harms: 1,
						friction: 2,
						uncertainty: 0,
					},
				],
				metric_total: 3,
				metric_max: 2,
			};
			writeFileSync(
				path.join(runDir, "baseline.json"),
				JSON.stringify({ runId: run, ...payload }) + "\n",
			);
			mkdirSync(path.join(runDir, "iterations/000"), { recursive: true });
			writeFileSync(
				path.join(runDir, "iterations/000/scores.json"),
				JSON.stringify(payload) + "\n",
			);
			const copied = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.notEqual(copied.code, 0);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const missing = copied.json.missing as string[];
			assert.ok(
				missing.some((m) =>
					m.includes(
						"copied_scores_without_justification:iterations/000/scores.json",
					),
				),
				JSON.stringify(missing),
			);

			// explicit justification makes the carry-over legal
			writeFileSync(
				path.join(runDir, "iterations/000/scores.json"),
				JSON.stringify({
					...payload,
					justification: "no product change since baseline; re-measure pending",
				}) + "\n",
			);
			const justified = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.notEqual(justified.code, 0);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(justified.json.missing as string[]).some((m) =>
					m.includes("copied_scores_without_justification"),
				),
			);

			// differing scores pass the lint without justification
			writeFileSync(
				path.join(runDir, "iterations/000/scores.json"),
				JSON.stringify({ ...payload, metric_total: 2, metric_max: 1 }) + "\n",
			);
			const reMeasured = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(reMeasured.json.missing as string[]).some((m) =>
					m.includes("copied_scores_without_justification"),
				),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("assert-complete fails on empty / product-only run", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-empty", "--experiences", "dx"]);
			const { code, json } = runRl(dir, [
				"--mode",
				"assert-complete",
				"--run",
				"t-empty",
			]);
			assert.notEqual(code, 0);
			assert.equal(json.ok, false);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const missing = json.missing as string[];
			assert.ok(missing.includes("no_iterations"));
			assert.ok(missing.includes("bus_complete_triples_lt_1"));
			assert.ok(missing.includes("delight_regime_never_entered"));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("mutating completion requires a verified experiment and feature coverage", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-required", "--experiences", "dx"]);
			const result = runRl(dir, ["--mode", "assert-complete", "--run", "t-required"]);
			assert.notEqual(result.code, 0);
			assert.match(result.stdout, /verified_experiment_missing/);
			assert.match(result.stdout, /feature_coverage_missing/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("surface maps resolve through the project registry", () => {
		const dir = seedRepo();
		try {
			mkdirSync(path.join(dir, "examples/demo/.optimizexp"), { recursive: true });
			writeFileSync(path.join(dir, "examples/demo/package.json"), '{"name":"demo"}\n');
			writeFileSync(path.join(dir, "examples/demo/.optimizexp/surface-map.json"), "{}\n");
			runRl(dir, ["--mode", "init", "--run", "t-map", "--experiences", "dx", "--projects", "demo"]);
			const result = runRl(dir, ["--mode", "assert-complete", "--run", "t-map"]);
			assert.doesNotMatch(result.stdout, /surface_map_missing:demo/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("foreign bus entries cannot satisfy a run", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-isolated", "--experiences", "dx"]);
			writeFileSync(path.join(dir, ".optimizexp/bus/entries/foreign.json"), JSON.stringify({
				kind: "expect", id: "foreign-expect", runId: "other-run",
			}) + "\n");
			const result = runRl(dir, ["--mode", "assert-complete", "--run", "t-isolated"]);
			assert.notEqual(result.code, 0);
			assert.match(result.stdout, /bus_complete_triples_lt_1/);
			assert.match(result.stdout, /verified_experiment_missing/);
			assert.doesNotMatch(result.stdout, /runId_mismatch/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("assert-complete fails after harm plateau alone", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-harm", "--experiences", "dx"]);
			const prev = writeScores(dir, "prev.json", 1, 1);
			const curr = writeScores(dir, "curr.json", 1, 1);
			runRl(dir, [
				"--mode",
				"should-stop",
				"--run",
				"t-harm",
				"--iteration",
				"1",
				"--scores",
				curr,
				"--prev-scores",
				prev,
				"--implementable-findings",
				"0",
			]);
			const { code, json } = runRl(dir, [
				"--mode",
				"assert-complete",
				"--run",
				"t-harm",
			]);
			assert.notEqual(code, 0);
			assert.equal(json.ok, false);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const missing = json.missing as string[];
			// delight entered via should-stop, but still no equilibrium/bus/etc
			assert.ok(missing.includes("no_equilibrium_stop") || missing.includes("bus_complete_triples_lt_1"));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("equilibrium omit implementable counts cannot stop", () => {
		const dir = seedRepo();
		try {
			runRl(dir, ["--mode", "init", "--run", "t-eq", "--experiences", "dx"]);
			const prev = writeScores(dir, "prev.json", 0, 0, {
				delight_total: 12,
				gap_max: 1,
			});
			const curr = writeScores(dir, "curr.json", 0, 0, {
				delight_total: 12,
				gap_max: 1,
			});
			const { code, json } = runRl(dir, [
				"--mode",
				"equilibrium",
				"--run",
				"t-eq",
				"--scores",
				curr,
				"--prev-scores",
				prev,
				"--regime",
				"delight_maximize",
			]);
			assert.notEqual(code, 0);
			assert.equal(json.stop, false);
			assert.equal(json.reason, "continue-undeclared-implementable-counts");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("full legal closeout: assert-complete + mark-complete", () => {
		const dir = seedRepo();
		const run = "t-full";
		try {
			runRl(dir, [
				"--mode",
				"init",
				"--run",
				run,
				"--experiences",
				"dx,ux",
				"--personas",
				"dev",
			]);
			const runDir = path.join(dir, ".optimizexp/runs", run);
			mkdirSync(path.join(runDir, "iterations/001"), { recursive: true });
			mkdirSync(path.join(runDir, "survey"), { recursive: true });
			writeFileSync(
				path.join(runDir, "iterations/001/scores.json"),
				JSON.stringify({
					iteration: 1,
					cells: [
						{
							persona: "dev",
							surface: "cli",
							harms: 0,
							friction: 0,
							uncertainty: 0,
						},
					],
					metric_total: 0,
					metric_max: 0,
					delight_total: 12,
					gap_max: 1,
				}) + "\n",
			);
			writeFileSync(
				path.join(runDir, "iterations/001/findings.md"),
				"# Findings\n\nNo S/M left.\n",
			);
			writeFileSync(
				path.join(runDir, "summary.md"),
				"# Summary\n\nstopReason: **pareto-equilibrium**\n",
			);
			writeFileSync(path.join(runDir, "survey/r.json"), "{}\n");
			writeFileSync(path.join(runDir, "backlog.json"), '{"items":[]}\n');
			writeFileSync(path.join(runDir, "feature-coverage.json"), JSON.stringify({ runId: run, ok: true }) + "\n");
			writeFileSync(path.join(runDir, "before.txt"), "before\n");
			writeFileSync(path.join(runDir, "after.txt"), "after\n");
			// bus scorecards cite "before.txt" root-relative; evidence must exist
			writeFileSync(path.join(dir, "before.txt"), "before\n");

			const bus = path.join(dir, ".optimizexp/bus/entries");
			writeFileSync(
				path.join(bus, "e.json"),
				JSON.stringify({
					kind: "expect",
					id: "e1",
					runId: run,
					persona: "dev",
					scores: card("expect"),
				}) + "\n",
			);
			writeFileSync(
				path.join(bus, "a.json"),
				JSON.stringify({
					kind: "act",
					id: "a1",
					expects: "e1",
					 runId: run,
					scores: card("act"),
				}) + "\n",
			);
			writeFileSync(
				path.join(bus, "o.json"),
				JSON.stringify({
					kind: "outcome",
					id: "o1",
					expects: "e1",
					actId: "a1",
					 runId: run,
					scores: card("outcome"),
					comparison: { expectId: "e1", matchedExpectation: true, deltaFromExpect: { harms: 0, friction: 0, uncertainty: 0, total: 0, max: 0 }, expectationMatch: { behavior: true, scoresWithinTol: true, tolerance: 0 } },
				}) + "\n",
			);
			const digest = (value: string) => createHash("sha256").update(value).digest("hex");
			mkdirSync(path.join(runDir, "iterations/001/experiments"), { recursive: true });
			writeFileSync(path.join(runDir, "iterations/001/experiments/e1.json"), JSON.stringify({
				runId: run, iteration: 1, id: "e1", regime: "delight_maximize", reportOnly: false,
				mutationKind: "file", before: { path: `.optimizexp/runs/${run}/before.txt`, sha256: digest("before\n") }, after: { path: `.optimizexp/runs/${run}/after.txt`, sha256: digest("after\n") },
				afterOutcomeId: "o1", result: "improved", verifiedAt: new Date().toISOString(),
			}) + "\n");

			const prev = writeScores(dir, "prev.json", 0, 0, {
				delight_total: 12,
				gap_max: 1,
			});
			const curr = writeScores(dir, "curr.json", 0, 0, {
				delight_total: 12,
				gap_max: 1,
			});
			// enter delight via should-stop
			runRl(dir, [
				"--mode",
				"should-stop",
				"--run",
				run,
				"--iteration",
				"1",
				"--scores",
				curr,
				"--prev-scores",
				prev,
				"--implementable-findings",
				"0",
			]);
			const equilibriumArgs = [
				"--mode",
				"equilibrium",
				"--run",
				run,
				"--scores",
				curr,
				"--prev-scores",
				prev,
				"--implementable-harm",
				"0",
				"--implementable-uplift",
				"0",
				"--regime",
				"delight_maximize",
			];
			runRl(dir, equilibriumArgs);
			const eq = runRl(dir, equilibriumArgs);
			assert.equal(eq.json.stop, true);

			const ac = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.equal(ac.code, 0, ac.stdout);
			assert.equal(ac.json.ok, true);

			const mc = runRl(dir, [
				"--mode",
				"mark-complete",
				"--run",
				run,
				"--stop-reason",
				"pareto-equilibrium",
			]);
			assert.equal(mc.code, 0, mc.stdout);
			const scope = JSON.parse(
				readFileSync(path.join(runDir, "scope.json"), "utf8"),
			);
			assert.equal(scope.status, "complete");
			assert.equal(scope.stopReason, "pareto-equilibrium");
			assert.ok(!existsSync(path.join(runDir, "INCOMPLETE.md")));
			assert.ok(existsSync(path.join(runDir, "COMPLETE.md")));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("optimizexp artifact-truth gates", () => {
	function seedWebProduct(dir: string) {
		const pkg = path.join(dir, "packages/DemoWeb/.optimizexp");
		mkdirSync(pkg, { recursive: true });
		writeFileSync(
			path.join(pkg, "config.json"),
			JSON.stringify({
				schemaVersion: 1,
				kind: "project",
				product: { id: "demo-web", package: "@demo/web", entry: "packages/DemoWeb" },
				defaults: { driver: "web" },
				features: { idPrefix: "demo-web-" },
				competitive: {
					scorecard: ".optimizexp/competitive/demo-web-dimensions.json",
					requireScorecardOnComplete: true,
				},
			}) + "\n",
		);
		mkdirSync(path.join(dir, ".optimizexp/competitive"), { recursive: true });
		writeFileSync(
			path.join(dir, ".optimizexp/competitive/demo-web-dimensions.json"),
			JSON.stringify({
				schemaVersion: 1,
				dimensions: [
					{
						id: "craft",
						status: "partial",
						evidencePaths: [],
						featureIds: ["demo-web-first-use"],
						lastRunId: "someone-else",
					},
				],
			}) + "\n",
		);
	}

	function bindRunToProduct(dir: string, run: string) {
		const scopePath = path.join(dir, ".optimizexp/runs", run, "scope.json");
		const scope = JSON.parse(readFileSync(scopePath, "utf8"));
		scope.features = ["demo-web-first-use"];
		writeFileSync(scopePath, JSON.stringify(scope) + "\n");
	}

	it("scorecard, defects, token audit, and mobile evidence block a bound web run", () => {
		const dir = seedRepo();
		const run = "t-truth";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedWebProduct(dir);
			bindRunToProduct(dir, run);
			writeFileSync(
				path.join(dir, ".optimizexp/defects.json"),
				JSON.stringify({
					defects: [
						{ id: "D-OPEN", severity: "P0", status: "open", projects: ["demo-web"] },
						{ id: "D-CLOSED", severity: "P0", status: "closed", projects: ["demo-web"] },
						{ id: "D-OTHER", severity: "P1", status: "open", projects: ["unrelated"] },
					],
				}) + "\n",
			);
			const { json } = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const missing = json.missing as string[];
			assert.ok(missing.includes("standing_defect_open:D-OPEN"), JSON.stringify(missing));
			assert.ok(!missing.includes("standing_defect_open:D-CLOSED"));
			assert.ok(!missing.includes("standing_defect_open:D-OTHER"));
			assert.ok(missing.includes("scorecard_artifact_missing:demo-web"));
			assert.ok(missing.includes("dimension_empty_evidence:craft"));
			assert.ok(missing.includes("dimension_not_rescored:craft"));
			assert.ok(missing.includes("token_audit_missing"));
			assert.ok(missing.includes("mobile_evidence_missing"));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("token audit enforces only failing classes and clears when clean", () => {
		const dir = seedRepo();
		const run = "t-audit";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedWebProduct(dir);
			bindRunToProduct(dir, run);
			mkdirSync(path.join(dir, ".optimizexp/audits"), { recursive: true });
			writeFileSync(
				path.join(dir, ".optimizexp/audits/token-conformance.json"),
				JSON.stringify({ summary: { "undefined-token": 1, "near-miss-palette": 40 } }) + "\n",
			);
			const failing = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const failingMissing = failing.json.missing as string[];
			assert.ok(failingMissing.includes("token_audit_failing:undefined-token"));
			assert.ok(!failingMissing.some((m) => m.includes("near-miss-palette")));

			writeFileSync(
				path.join(dir, ".optimizexp/audits/token-conformance.json"),
				JSON.stringify({ summary: { "near-miss-palette": 40 } }) + "\n",
			);
			const clean = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const cleanMissing = clean.json.missing as string[];
			assert.ok(!cleanMissing.some((m) => m.startsWith("token_audit")));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("dimension status upgrades require a design-council verdict", () => {
		const dir = seedRepo();
		const run = "t-council";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedWebProduct(dir);
			bindRunToProduct(dir, run);
			const runDir = path.join(dir, ".optimizexp/runs", run);
			writeFileSync(
				path.join(runDir, "competitive-scorecard.json"),
				JSON.stringify({
					runId: run,
					dimensions: [{ id: "craft", status: "proven" }],
				}) + "\n",
			);
			const blocked = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(blocked.json.missing as string[]).includes("council_verdict_missing:craft"),
			);

			writeFileSync(path.join(runDir, "design-council.md"), "# Verdict\npass\n");
			const allowed = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(allowed.json.missing as string[]).includes("council_verdict_missing:craft"),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("malformed backlog items block completion until repaired", () => {
		const dir = seedRepo();
		const run = "t-backlog";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "dx"]);
			mkdirSync(path.join(dir, ".optimizexp/backlog"), { recursive: true });
			writeFileSync(
				path.join(dir, ".optimizexp/backlog/experiments.json"),
				JSON.stringify({
					items: [
						{
							title: "Collapse DID under handle",
							hypothesis: 'If we deliver "undefined", positive metrics rise.',
						},
					],
				}) + "\n",
			);
			const bad = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(bad.json.missing as string[]).some((m) => m.startsWith("backlog_malformed:")),
				JSON.stringify(bad.json.missing),
			);

			writeFileSync(
				path.join(dir, ".optimizexp/backlog/experiments.json"),
				JSON.stringify({
					items: [
						{
							id: "fr-collapse-did",
							title: "Collapse DID under handle",
							problem: "DID wraps on mobile.",
							desiredOutcome: "DID collapses under the handle on mobile.",
							hypothesis: 'If we deliver "DID collapses under the handle on mobile.", positive metrics rise.',
						},
					],
				}) + "\n",
			);
			const good = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(good.json.missing as string[]).some((m) => m.startsWith("backlog_malformed:")),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("dimensions marked missing owe no evidence; partial ones do", () => {
		const dir = seedRepo();
		const run = "t-evidence";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedWebProduct(dir);
			bindRunToProduct(dir, run);
			writeFileSync(
				path.join(dir, ".optimizexp/competitive/demo-web-dimensions.json"),
				JSON.stringify({
					schemaVersion: 1,
					dimensions: [
						{ id: "gap", status: "missing", evidencePaths: [], featureIds: [] },
						{ id: "blocked", status: "external-blocked", evidencePaths: [], featureIds: [] },
						{ id: "claimed", status: "partial", evidencePaths: [], featureIds: [] },
					],
				}) + "\n",
			);
			const { json } = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const missing = json.missing as string[];
			assert.ok(!missing.includes("dimension_empty_evidence:gap"), JSON.stringify(missing));
			assert.ok(!missing.includes("dimension_empty_evidence:blocked"));
			assert.ok(missing.includes("dimension_empty_evidence:claimed"));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("mobile evidence gate accepts a narrow-viewport capture", () => {
		const dir = seedRepo();
		const run = "t-mobile";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedWebProduct(dir);
			bindRunToProduct(dir, run);
			const evDir = path.join(dir, "evidence/mobile-check");
			mkdirSync(evDir, { recursive: true });
			writeFileSync(
				path.join(evDir, "meta.json"),
				JSON.stringify({ screen: { widthPx: 390, heightPx: 844 } }) + "\n",
			);
			writeFileSync(
				path.join(dir, ".optimizexp/bus/entries", `x-${run}-outcome.json`),
				JSON.stringify({ evidence: { path: "evidence/mobile-check" } }) + "\n",
			);
			const { json } = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(json.missing as string[]).includes("mobile_evidence_missing"),
				JSON.stringify(json.missing),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("optimizexp criticism gates", () => {
	function seedUxWebRun(dir: string, run: string) {
		const pkg = path.join(dir, "packages/DemoWeb/.optimizexp");
		mkdirSync(pkg, { recursive: true });
		writeFileSync(
			path.join(pkg, "config.json"),
			JSON.stringify({
				schemaVersion: 1,
				kind: "project",
				product: { id: "demo-web", entry: "packages/DemoWeb" },
				defaults: { driver: "web" },
				features: { idPrefix: "demo-web-" },
			}) + "\n",
		);
		const scopePath = path.join(dir, ".optimizexp/runs", run, "scope.json");
		const scope = JSON.parse(readFileSync(scopePath, "utf8"));
		scope.features = ["demo-web-first-use"];
		writeFileSync(scopePath, JSON.stringify(scope) + "\n");
	}

	it("an unadjudicated detector finding blocks completion, a reasoned waiver clears it", () => {
		const dir = seedRepo();
		const run = "t-detector";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedUxWebRun(dir, run);
			const runDir = path.join(dir, ".optimizexp/runs", run);

			// No detector.json at all: the loop cannot claim a UX pass without one.
			const bare = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(bare.json.missing as string[]).includes("detector_report_missing"),
				"a UX run with no detector pass must not complete",
			);

			// A finding nobody has adjudicated blocks completion.
			writeFileSync(
				path.join(runDir, "detector.json"),
				JSON.stringify({
					tool: "impeccable detect",
					findings: [{ rule: "side-tab", file: "src/styles.ts", line: 499, message: "thick colored border" }],
				}) + "\n",
			);
			const open = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(open.json.missing as string[]).some((m) => m.startsWith("detector_finding_unadjudicated")),
				"an unadjudicated finding must block",
			);

			// A waiver with a rubber-stamp reason is itself a finding — this is the
			// exact failure mode the apparatus exists to prevent.
			writeFileSync(
				path.join(runDir, "detector-waivers.json"),
				JSON.stringify({ waived: [{ rule: "side-tab", file: "src/styles.ts", reason: "ok" }] }) + "\n",
			);
			const stamped = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(stamped.json.missing as string[]).some((m) => m.startsWith("detector_waiver_unreasoned")),
				"a waiver without a real reason must not clear a finding",
			);

			// A reason that actually says something clears it.
			writeFileSync(
				path.join(runDir, "detector-waivers.json"),
				JSON.stringify({
					waived: [{
						rule: "side-tab",
						file: "src/styles.ts",
						reason: "ISOM control circle, not a decorative side-tab; shape carries the meaning",
					}],
				}) + "\n",
			);
			const cleared = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(cleared.json.missing as string[]).some((m) => m.startsWith("detector_")),
				"a reasoned waiver must clear the finding",
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("a unanimous persona panel fails validation", () => {
		const dir = seedRepo();
		const run = "t-unanimous";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			const runDir = path.join(dir, ".optimizexp/runs", run);
			mkdirSync(path.join(runDir, "iterations/001"), { recursive: true });
			// 2/3/3 is the vector the historical runs actually shared at iteration 1.
			// A 1/1/1 vector is the documented harm floor and is legitimately shared.
			const cells = ["discord", "github", "bluesky", "designer"].map((persona) => ({
				persona, surface: "web", harms: 2, friction: 3, uncertainty: 3,
			}));
			writeFileSync(
				path.join(runDir, "iterations/001/scores.json"),
				JSON.stringify({ iteration: 1, cells, metric_total: 12, metric_max: 3 }) + "\n",
			);
			const unanimous = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(unanimous.json.missing as string[]).some((m) => m.startsWith("scores_unanimous_across_personas")),
				JSON.stringify(unanimous.json.missing),
			);

			// One dissenting voice is enough to show the panel deliberated.
			cells[3] = { persona: "designer", surface: "web", harms: 4, friction: 2, uncertainty: 3 };
			writeFileSync(
				path.join(runDir, "iterations/001/scores.json"),
				JSON.stringify({ iteration: 1, cells, metric_total: 18, metric_max: 3 }) + "\n",
			);
			const diverged = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(diverged.json.missing as string[]).some((m) => m.startsWith("scores_unanimous_across_personas")),
			);

			// A converged harm floor shares one vector legitimately — that is the
			// documented terminal state, not a fabricated panel.
			const floor = cells.map((c) => ({ ...c, harms: 1, friction: 1, uncertainty: 1 }));
			writeFileSync(
				path.join(runDir, "iterations/001/scores.json"),
				JSON.stringify({ iteration: 1, cells: floor, metric_total: 12, metric_max: 3 }) + "\n",
			);
			const atFloor = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				!(atFloor.json.missing as string[]).some((m) => m.startsWith("scores_unanimous_across_personas")),
				"a converged harm floor must not be flagged as a fabricated panel",
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("a UX web run without an executed design critique cannot complete", () => {
		const dir = seedRepo();
		const run = "t-critique";
		try {
			runRl(dir, ["--mode", "init", "--run", run, "--experiences", "ux"]);
			seedUxWebRun(dir, run);
			const missingCritique = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			assert.ok(
				// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
				(missingCritique.json.missing as string[]).includes("design_critique_missing"),
				JSON.stringify(missingCritique.json.missing),
			);

			// Prose without a verdict is not a judgement.
			const runDir = path.join(dir, ".optimizexp/runs", run);
			writeFileSync(path.join(runDir, "design-critique.md"), "# Notes\nThe screens look nice.\n");
			const noVerdict = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const noVerdictMissing = noVerdict.json.missing as string[];
			assert.ok(noVerdictMissing.includes("design_critique_has_no_verdict"));
			assert.ok(noVerdictMissing.includes("design_critique_missing_persona"));

			writeFileSync(
				path.join(runDir, "design-critique.md"),
				"# Critique\nPersona: designer\nVerdict: FAIL — three row components.\n",
			);
			const judged = runRl(dir, ["--mode", "assert-complete", "--run", run]);
			// SAFETY: The test fixture intentionally constructs this typed value to exercise the boundary.
			const judgedMissing = judged.json.missing as string[];
			assert.ok(!judgedMissing.some((m) => m.startsWith("design_critique")));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
