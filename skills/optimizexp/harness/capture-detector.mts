/**
 * Capture an impeccable detector pass as run evidence.
 *
 * optimizexp scores personas; impeccable measures markup. The loop's own metrics
 * cannot encode ugliness — a visually incoherent screen that is safe, fast and
 * unambiguous scores 0/0/0 on harms, friction and uncertainty — so five
 * completed runs converged on a harm floor while the product carried 13 button
 * treatments and 28 controls under 32px. This writes the one input to the loop
 * that does not negotiate.
 *
 * Usage:
 *   tsx capture-detector.mts --run <runId> --target <path> [--target <path>...]
 *
 * Writes `.optimizexp/runs/<runId>/detector.json`. Waivers are authored by hand
 * next to it in `detector-waivers.json`; this never writes them, because a tool
 * that both finds and forgives findings forgives everything.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

interface DetectorFinding {
	readonly rule: string;
	readonly file: string;
	readonly line: number | null;
	readonly message: string;
}

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

function args(name: string): string[] {
	const out: string[] = [];
	process.argv.forEach((a, i) => {
		if (a === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
	});
	return out;
}

/**
 * The CLI prints human lines, not JSON, so parse its shape:
 *   <absolute path>
 *     line 499: [rule-id] offending source
 *       → advice
 */
function parse(stdout: string, root: string): DetectorFinding[] {
	const findings: DetectorFinding[] = [];
	let file = "";
	// eslint-disable-next-line no-control-regex
	const ansi = /\u001B\[[0-9;]*m/gu;
	for (const raw of stdout.split("\n")) {
		const line = raw.replace(ansi, "").replace(/\s+$/u, "");
		if (/^\//u.test(line)) {
			file = path.relative(root, line.trim());
			continue;
		}
		const m = /^\s*line (\d+): \[([a-z0-9-]+)\]\s*(.*)$/u.exec(line);
		if (m) {
			findings.push({
				rule: m[2],
				file,
				line: Number(m[1]),
				message: m[3].trim(),
			});
		}
	}
	return findings;
}

function main(): void {
	const runId = arg("run");
	if (!runId) {
		console.error("capture-detector: --run <runId> is required");
		process.exit(2);
	}
	const targets = args("target");
	if (targets.length === 0) {
		console.error("capture-detector: at least one --target <path> is required");
		process.exit(2);
	}
	const root = process.cwd();

	// A path the detector cannot see exits 0 with no output, which would write a
	// clean report for something that was never scanned. Refuse to guess.
	for (const target of targets) {
		if (!existsSync(path.resolve(root, target))) {
			console.error(`capture-detector: target does not exist: ${target}`);
			process.exit(2);
		}
	}

	let stdout: string;
	try {
		stdout = execFileSync("npx", ["impeccable", "detect", ...targets], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (error) {
		// The detector uses exit 2 for "found something" and 1 for its own failure.
		// Treating any non-zero exit with output as findings meant a real command
		// failure wrote `findings: []`, which the gate reads as clean — the same
		// always-passes hole as reading only stdout. Only 2 is a report.
		const e = error as { status?: number; stdout?: string; stderr?: string };
		if (e.status !== 2) throw error;
		// On that path it reports on stderr, so reading only stdout silently
		// produced a clean report for a dirty file.
		stdout = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
		if (stdout.trim() === "") throw error;
	}

	const findings = parse(stdout, root);
	const runDir = path.join(root, ".optimizexp", "runs", runId);
	if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });
	const outPath = path.join(runDir, "detector.json");
	writeFileSync(
		outPath,
		JSON.stringify(
			{
				tool: "impeccable detect",
				targets,
				findings,
				summary: findings.reduce<Record<string, number>>((acc, f) => {
					acc[f.rule] = (acc[f.rule] ?? 0) + 1;
					return acc;
				}, {}),
			},
			null,
			2,
		) + "\n",
	);
	console.log(
		`capture-detector: ${findings.length} finding(s) → ${path.relative(root, outPath)}`,
	);
	if (findings.length > 0) {
		console.log(
			"capture-detector: each finding must be fixed or waived with a reason in detector-waivers.json",
		);
	}
}

main();
