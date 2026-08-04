import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type EvidenceClaim = { id: string; text: string };

/** A fault found during playback. Reviews without a place for these only confirm. */
export type EvidenceDefect = {
	element?: string;
	observation?: string;
	/** Numeric or quoted proof — "row height 164px", "\"sample\" appears 7 times". */
	measurement?: string;
	severity?: "P0" | "P1" | "P2";
};

export type EvidenceReview = {
	status?: "pending" | "accepted" | "rejected";
	reviewer?: string;
	/** Run that produced the capture; a reviewer equal to this is a self-review. */
	authoredBy?: string;
	relevance?: "relevant" | "irrelevant";
	completeness?: "complete" | "partial";
	coverageMode?: "full-journey" | "single-state";
	coveredClaims?: string[];
	defects?: EvidenceDefect[];
	artifactSha256?: string;
	reviewedAt?: string;
	notes?: string;
};

type EvidenceMeta = {
	driver?: string;
	degraded?: boolean;
	runId?: string;
	claims?: EvidenceClaim[];
	primary?: { file?: string; kind?: string; sha256?: string; bytes?: number };
};

function readJson<T>(file: string): T | null {
	try {
		return JSON.parse(readFileSync(file, "utf8")) as T;
	} catch {
		return null;
	}
}

export function validateEvidenceReview(dir: string): string[] {
	const problems: string[] = [];
	const meta = readJson<EvidenceMeta>(path.join(dir, "meta.json"));
	if (!meta) return ["meta_json_missing_or_invalid"];
	const review = readJson<EvidenceReview>(path.join(dir, "review.json"));
	if (!review) return ["evidence_review_missing_or_invalid"];
	const primary = meta.primary;
	if (!primary?.file || !existsSync(path.join(dir, primary.file))) {
		problems.push("primary_artifact_missing");
	}
	if (!primary?.sha256 || primary.sha256 !== review.artifactSha256) {
		problems.push("review_artifact_hash_mismatch");
	}
	if (review.status !== "accepted") problems.push("evidence_review_not_accepted");
	if (!review.reviewer?.trim()) problems.push("evidence_review_reviewer_missing");
	if (review.relevance !== "relevant") problems.push("evidence_not_marked_relevant");
	if (review.completeness !== "complete" || review.coverageMode !== "full-journey") {
		problems.push("evidence_not_marked_complete_full_journey");
	}
	if (!review.notes?.trim() || review.notes.trim().length < 20) {
		problems.push("evidence_review_notes_missing_or_too_short");
	}
	if (meta.degraded) problems.push("degraded_capture_not_acceptable_proof");
	// A review by the run that produced the capture is a confirmation, not a review.
	const authoredBy = (review.authoredBy ?? meta.runId ?? "").trim();
	if (authoredBy !== "" && review.reviewer?.trim() === authoredBy) {
		problems.push("evidence_review_is_self_review");
	}
	// Defects must be an explicit decision. An empty array is a claim that the
	// surface is clean; omitting the field means nobody looked for faults.
	if (!Array.isArray(review.defects)) {
		problems.push("evidence_review_missing_defect_list");
	} else {
		for (const [index, defect] of review.defects.entries()) {
			const label = defect.element?.trim() || String(index);
			if (!defect.observation?.trim() || !defect.measurement?.trim()) {
				problems.push(`evidence_defect_unsubstantiated:${label}`);
			}
			if (!["P0", "P1", "P2"].includes(defect.severity ?? "")) {
				problems.push(`evidence_defect_severity_invalid:${label}`);
			}
		}
	}
	const claims = meta.claims ?? [];
	const covered = new Set(review.coveredClaims ?? []);
	for (const claim of claims) {
		if (!covered.has(claim.id)) problems.push(`evidence_claim_uncovered:${claim.id}`);
	}
	const driver = meta.driver ?? "";
	const kind = primary?.kind ?? "";
	if ((driver === "cli" || driver === "tui") && kind !== "recording") {
		problems.push(`${driver}_requires_replayable_recording`);
	}
	if ((driver === "web" || driver === "native") && claims.length > 1 && !["video", "gif"].includes(kind)) {
		problems.push(`${driver}_multi_step_scenario_requires_video_or_gif`);
	}
	return [...new Set(problems)];
}
