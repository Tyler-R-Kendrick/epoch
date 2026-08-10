"""Stable vocabularies shared by every gauntlet module.

These names are part of the persisted contract (dev.gauntlet/v1). Extending a
closed vocabulary requires a namespaced value (``x-<namespace>/<name>``), not a
silent semantic change to an existing member.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Final

SKILL_NAME: Final = "gauntlet-loop"
SKILL_CONTRACT: Final = "dev.gauntlet/v1"
PROJECT_DIR_NAME: Final = ".gauntlet"
DEFAULT_STORE_RELPATH: Final = ".gauntlet/state/activegraph.sqlite3"
WORKTREE_BRANCH_PREFIX: Final = "gauntlet"
DIGEST_ALGORITHM: Final = "sha256"


class ExitCode:
    """Stable CLI exit-code vocabulary (see references/contracts.md)."""

    OK: Final = 0
    INVALID: Final = 2
    APPROVAL_REQUIRED: Final = 3
    GATE_FAILED: Final = 4
    INCONCLUSIVE: Final = 5
    CONFLICT: Final = 6
    OUTCOME_UNKNOWN: Final = 7
    DEPENDENCY_UNAVAILABLE: Final = 8
    SECURITY_VIOLATION: Final = 9


class ActionClass(StrEnum):
    """ActiveGraph closed authority classes; reused, never re-invented."""

    R0 = "R0"
    R1 = "R1"
    R2 = "R2"
    R3 = "R3"
    R4 = "R4"


ACTION_CLASS_ORDER: Final = {
    ActionClass.R0: 0,
    ActionClass.R1: 1,
    ActionClass.R2: 2,
    ActionClass.R3: 3,
    ActionClass.R4: 4,
}


class EffectClass(StrEnum):
    """Orthogonal-to-authority effect vocabulary."""

    PURE = "pure"
    READ_ONLY = "read_only"
    IDEMPOTENT_KNOWN_OUTCOME = "idempotent_known_outcome"
    BUFFERABLE = "bufferable"
    REVERSIBLE = "reversible"
    REVERSIBLE_WITH_COST = "reversible_with_cost"
    IRREVERSIBLE_GATED = "irreversible_gated"
    UNKNOWN = "unknown"


class IntentState(StrEnum):
    """Write-ahead authority state machine."""

    PROPOSED = "proposed"
    VOTING = "voting"
    COMMITTED = "committed"
    ABORTED = "aborted"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED_BEFORE_EFFECT = "failed_before_effect"
    FAILED_AFTER_EFFECT = "failed_after_effect"
    OUTCOME_UNKNOWN = "outcome_unknown"
    COMPENSATED = "compensated"
    COMPENSATION_FAILED = "compensation_failed"
    RECONCILED = "reconciled"


INTENT_TRANSITIONS: Final[dict[IntentState, frozenset[IntentState]]] = {
    IntentState.PROPOSED: frozenset({IntentState.VOTING, IntentState.ABORTED}),
    IntentState.VOTING: frozenset({IntentState.COMMITTED, IntentState.ABORTED}),
    IntentState.COMMITTED: frozenset({IntentState.EXECUTING, IntentState.ABORTED}),
    IntentState.ABORTED: frozenset(),
    IntentState.EXECUTING: frozenset(
        {
            IntentState.COMPLETED,
            IntentState.FAILED_BEFORE_EFFECT,
            IntentState.FAILED_AFTER_EFFECT,
            IntentState.OUTCOME_UNKNOWN,
        }
    ),
    IntentState.COMPLETED: frozenset(),
    IntentState.FAILED_BEFORE_EFFECT: frozenset(),
    IntentState.FAILED_AFTER_EFFECT: frozenset(
        {IntentState.COMPENSATED, IntentState.COMPENSATION_FAILED}
    ),
    IntentState.OUTCOME_UNKNOWN: frozenset(
        {IntentState.RECONCILED, IntentState.COMPENSATED, IntentState.COMPENSATION_FAILED}
    ),
    IntentState.COMPENSATED: frozenset(),
    IntentState.COMPENSATION_FAILED: frozenset(),
    IntentState.RECONCILED: frozenset(),
}


class BeliefState(StrEnum):
    RAW = "raw"
    TENTATIVE = "tentative"
    VALIDATED = "validated"
    COMMITTED = "committed"
    ACTION_SAFE = "action_safe"
    QUARANTINED = "quarantined"
    SUPERSEDED = "superseded"
    REVOKED = "revoked"


BELIEF_TRANSITIONS: Final[dict[BeliefState, frozenset[BeliefState]]] = {
    BeliefState.RAW: frozenset(
        {BeliefState.TENTATIVE, BeliefState.QUARANTINED, BeliefState.REVOKED}
    ),
    BeliefState.TENTATIVE: frozenset(
        {
            BeliefState.VALIDATED,
            BeliefState.QUARANTINED,
            BeliefState.SUPERSEDED,
            BeliefState.REVOKED,
        }
    ),
    BeliefState.VALIDATED: frozenset(
        {
            BeliefState.COMMITTED,
            BeliefState.QUARANTINED,
            BeliefState.SUPERSEDED,
            BeliefState.REVOKED,
        }
    ),
    BeliefState.COMMITTED: frozenset(
        {
            BeliefState.ACTION_SAFE,
            BeliefState.QUARANTINED,
            BeliefState.SUPERSEDED,
            BeliefState.REVOKED,
        }
    ),
    BeliefState.ACTION_SAFE: frozenset(
        {BeliefState.QUARANTINED, BeliefState.SUPERSEDED, BeliefState.REVOKED}
    ),
    BeliefState.QUARANTINED: frozenset(
        {BeliefState.TENTATIVE, BeliefState.SUPERSEDED, BeliefState.REVOKED}
    ),
    BeliefState.SUPERSEDED: frozenset(),
    BeliefState.REVOKED: frozenset(),
}


class ExperimentStatus(StrEnum):
    PROPOSED = "proposed"
    BLOCKED = "blocked"
    RUNNING = "running"
    KEEP = "keep"
    DISCARD = "discard"
    CRASH = "crash"
    INCONCLUSIVE = "inconclusive"
    SUPERSEDED = "superseded"


class ArtifactRole(StrEnum):
    NORMATIVE = "normative"
    CANONICAL = "canonical"
    DERIVED = "derived"
    OBSERVATIONAL = "observational"
    EVALUATIVE = "evaluative"


class ActionSeam(StrEnum):
    """Closed initial action-seam vocabulary for interventions."""

    SPECIFICATION = "specification"
    REFERENCE_DATA = "reference-data"
    TRAINING_OR_EXAMPLE_DATA = "training-or-example-data"
    DETERMINISTIC_OPERATOR = "deterministic-operator"
    TOOL_OR_EFFECT_ADAPTER = "tool-or-effect-adapter"
    WORKFLOW_OR_HARNESS = "workflow-or-harness"
    PROMPT_SKILL_OR_RETRIEVAL = "prompt-skill-or-retrieval"
    EVALUATOR = "evaluator"
    MODEL = "model"
    REPRESENTATION = "representation"


class EvaluatorRole(StrEnum):
    INVARIANT_CHECKER = "invariant-checker"
    COMPARATOR = "comparator"
    LOCALIZER = "localizer"
    DIAGNOSTICIAN = "diagnostician"
    ADVERSARY = "adversary"
    INTEGRATION_CRITIC = "integration-critic"
    META_EVALUATOR = "meta-evaluator"
    HUMAN_ADJUDICATOR = "human-adjudicator"


class IndependenceLevel(StrEnum):
    """Evaluator independence ladder (L0 weakest, L4 strongest)."""

    L0 = "L0"
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    L4 = "L4"


class SplitKind(StrEnum):
    SEARCH = "search"
    CALIBRATION = "calibration"
    PROMOTION = "promotion"


class ReplayMode(StrEnum):
    REBUILD = "rebuild"
    STRICT = "strict"
    FORK = "fork"
    DIFF = "diff"


class VoteDecision(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"


class VoterKind(StrEnum):
    DETERMINISTIC_POLICY = "deterministic-policy"
    SPEC_SCOPE = "spec-scope"
    BUDGET = "budget"
    EVALUATOR_PROMOTION = "evaluator-promotion"
    HUMAN_APPROVAL = "human-approval"
    LLM_SEMANTIC = "llm-semantic"


class StopReason(StrEnum):
    SUCCESS_CONDITIONS_MET = "success-conditions-met"
    BUDGET_EXHAUSTED = "budget-exhausted"
    TARGET_REACHED = "target-reached"
    PLATEAU = "plateau"
    EVALUATOR_DISAGREEMENT = "evaluator-disagreement"
    REPRESENTATION_GAP = "representation-gap"
    SPEC_AMBIGUITY = "spec-ambiguity"
    UNRESOLVED_CRITICAL_ISSUE = "unresolved-critical-issue"
    CYCLIC_REPAIR_OR_GAMING = "cyclic-repair-or-gaming"
    AUTHORIZED_STOP = "authorized-stop"


class CampaignState(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CHECKPOINTED = "checkpointed"
    STOPPED = "stopped"


CLOUDEVENT_TYPES: Final = (
    "dev.gauntlet.spec.frozen.v1",
    "dev.gauntlet.intent.proposed.v1",
    "dev.gauntlet.intent.committed.v1",
    "dev.gauntlet.intent.aborted.v1",
    "dev.gauntlet.effect.started.v1",
    "dev.gauntlet.effect.completed.v1",
    "dev.gauntlet.effect.failed.v1",
    "dev.gauntlet.effect.unknown.v1",
    "dev.gauntlet.effect.compensated.v1",
    "dev.gauntlet.observation.recorded.v1",
    "dev.gauntlet.belief.validated.v1",
    "dev.gauntlet.belief.revoked.v1",
    "dev.gauntlet.counterexample.created.v1",
    "dev.gauntlet.experiment.completed.v1",
    "dev.gauntlet.promotion.accepted.v1",
    "dev.gauntlet.promotion.rejected.v1",
    "dev.gauntlet.release.completed.v1",
)

BUNDLE_MEDIA_TYPES: Final = {
    "bundle": "application/vnd.gauntlet.bundle.v1+json",
    "spec": "application/vnd.gauntlet.spec.v1+yaml",
    "event-stream": "application/vnd.gauntlet.event-stream.v1+jsonl",
    "counterexample": "application/vnd.gauntlet.counterexample.v1+json",
    "evaluation": "application/vnd.gauntlet.evaluation.v1+json",
    "promotion": "application/vnd.gauntlet.promotion.v1+json",
    "provenance": "application/vnd.gauntlet.provenance.v1+json",
}

DEFAULT_FROZEN_SURFACES: Final = (
    ".gauntlet/policies/**",
    ".gauntlet/schemas/**",
    ".gauntlet/datasets/promotion/**",
    ".gauntlet/evaluators/**",
    "<skill-root>/scripts/gauntlet/promotion.py",
    "<skill-root>/scripts/gauntlet/authority.py",
    "<skill-root>/scripts/gauntlet/effects.py",
    "<skill-root>/evals/**",
)

DEFAULT_CAPABILITIES: Final[dict[str, tuple[str, str | None]]] = {
    "inspect": ("R0", None),
    "validate": ("R0", None),
    "rebuild-state": ("R0", None),
    "write-gauntlet-state": ("R1", None),
    "edit-candidate-worktree": ("R1", None),
    "run-bounded-local-evaluator": ("R1", None),
    "run-costly-experiment": ("R2", "required"),
    "install-dependency": ("R2", "required"),
    "update-local-promotion-branch": ("R2", "required"),
    "push": ("R3", "human"),
    "publish": ("R3", "human"),
    "deploy": ("R3", "human"),
    "send-or-notify": ("R3", "human"),
    "update-shared-memory": ("R3", "human"),
    "change-frozen-spec": ("R4", "governance"),
    "change-authority-policy": ("R4", "governance"),
    "change-promotion-kernel": ("R4", "governance"),
    "change-sealed-suite": ("R4", "governance"),
    "change-trust-root": ("R4", "governance"),
}
