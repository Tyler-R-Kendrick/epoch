"""PROV export, unsigned statements, bundles, oras safety, cosign gating."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pytest

from gauntlet.adapters.attestation import UNSIGNED_LABEL
from gauntlet.adapters.oras_cli import OrasClient, build_push_argv
from gauntlet.bundles import BundleContent, BundleService
from gauntlet.constants import ArtifactRole
from gauntlet.errors import (
    ApprovalRequiredError,
    ConflictError,
    DependencyUnavailableError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.models import (
    ActorRefV1,
    ArtifactRefV1,
    DigestRefV1,
    IntegrationsConfigV1,
    ProvenanceRecordV1,
)
from gauntlet.provenance import (
    build_gauntlet_statement,
    export_prov_json,
    export_prov_jsonld,
    sign_statement,
)
from gauntlet.support import CompletedProcess, FrozenClock, SequentialIdGenerator


@dataclass
class FakeRunner:
    """Records argv calls; raises like SubprocessRunner for a missing exe."""

    missing_executables: set[str] = field(default_factory=set)
    exit_code: int = 0
    stdout: str = ""
    calls: list[list[str]] = field(default_factory=list)

    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess:
        if argv[0] in self.missing_executables:
            raise InvalidInvocationError(f"executable not found: {argv[0]!r}")
        self.calls.append(list(argv))
        return CompletedProcess(
            argv=tuple(argv), exit_code=self.exit_code, stdout=self.stdout, stderr=""
        )


@dataclass
class FakeAuthority:
    allowed: bool = True

    def authorize_effect(self, capability: str) -> bool:
        return self.allowed


PROVENANCE = ProvenanceRecordV1(
    record_id="prov:000001",
    entities=[
        ArtifactRefV1(
            artifact_id="artifact:report",
            role=ArtifactRole.DERIVED,
            digest=DigestRefV1(value="ab" * 32, media_type="application/json"),
        )
    ],
    activities=["activity:evaluate"],
    agents=[ActorRefV1(actor_id="agent:gauntlet", kind="service")],
    relations=[
        {"type": "generation", "from": "artifact:report", "to": "activity:evaluate"},
        {"type": "attribution", "from": "artifact:report", "to": "agent:gauntlet"},
    ],
    created_at="2026-01-01T00:00:00.000Z",
)


def test_prov_json_export_shape() -> None:
    document = export_prov_json(PROVENANCE)

    assert "gauntlet:artifact_report" in document["entity"]
    assert document["entity"]["gauntlet:artifact_report"]["gauntlet:digest"].startswith("sha256:")
    assert "gauntlet:activity_evaluate" in document["activity"]
    assert "gauntlet:agent_gauntlet" in document["agent"]
    assert "wasGeneratedBy" in document
    assert "wasAttributedTo" in document


def test_prov_jsonld_export_has_context() -> None:
    document = export_prov_jsonld(PROVENANCE)
    assert "@context" in document
    assert document["@type"] == "prov:Bundle"


def test_malformed_relation_is_rejected() -> None:
    record = PROVENANCE.model_copy(update={"relations": [{"type": "bogus", "from": "a"}]})
    with pytest.raises(InvalidInvocationError):
        export_prov_json(record)


def test_unsigned_statement_is_labeled_unsigned() -> None:
    statement = build_gauntlet_statement(
        PROVENANCE, subjects=[("report.json", f"sha256:{'ab' * 32}")]
    )
    assert statement["_type"] == "https://in-toto.io/Statement/v1"
    assert statement["predicate"]["unsigned"] is True
    assert statement["predicate"]["label"] == UNSIGNED_LABEL
    assert "UNSIGNED" in UNSIGNED_LABEL


def test_cosign_missing_raises_dependency_unavailable(tmp_path: Path) -> None:
    runner = FakeRunner(missing_executables={"cosign"})
    with pytest.raises(DependencyUnavailableError, match="cosign"):
        sign_statement(
            tmp_path / "statement.json",
            tmp_path / "statement.sig",
            runner=runner,
            integrations=IntegrationsConfigV1(),
        )


def test_cosign_disabled_by_configuration(tmp_path: Path) -> None:
    with pytest.raises(DependencyUnavailableError, match="disabled"):
        sign_statement(
            tmp_path / "statement.json",
            tmp_path / "statement.sig",
            runner=FakeRunner(),
            integrations=IntegrationsConfigV1(cosign_cli="off"),
        )


# ---------------------------------------------------------------------------
# bundles
# ---------------------------------------------------------------------------


@pytest.fixture()
def service(clock: FrozenClock, ids: SequentialIdGenerator) -> BundleService:
    return BundleService(clock=clock, ids=ids)


CONTENT = BundleContent(
    spec_text="goal: demo\n",
    events=[
        {"type": "dev.gauntlet.observation.recorded.v1", "data": {"n": 1}},
        {"type": "dev.gauntlet.promotion.accepted.v1", "api_key": "sk-FAKEFAKEFAKE1234567890"},
    ],
    provenance=PROVENANCE,
)


def test_bundle_export_and_offline_verify(service: BundleService, tmp_path: Path) -> None:
    bundle_dir = tmp_path / "bundle"
    manifest = service.export(bundle_dir, CONTENT, campaign_id="campaign:demo")

    verified = service.verify(bundle_dir)
    assert verified.bundle_id == manifest.bundle_id
    assert (bundle_dir / "oci-layout").is_file()
    assert (bundle_dir / "oci-manifest.json").is_file()

    archive = service.export_archive(bundle_dir, tmp_path / "bundle.tar.gz")
    assert archive.is_file()


def test_bundle_redacts_secrets_before_writing(
    service: BundleService, tmp_path: Path
) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)
    for path in bundle_dir.rglob("*"):
        if path.is_file():
            assert b"sk-FAKEFAKEFAKE1234567890" not in path.read_bytes()


def test_tampered_bundle_fails_verification(service: BundleService, tmp_path: Path) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)
    target = bundle_dir / "entries" / "events.jsonl"
    raw = bytearray(target.read_bytes())
    raw[0] ^= 0xFF  # flip one byte
    target.write_bytes(bytes(raw))

    with pytest.raises(SecurityViolationError, match="digest mismatch"):
        service.verify(bundle_dir)


def test_hydrate_restores_state_and_refuses_divergent_overwrite(
    service: BundleService, tmp_path: Path
) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)

    target = tmp_path / "restore"
    written = service.hydrate(bundle_dir, target)
    assert (target / "entries" / "events.jsonl").is_file()
    assert written

    # identical content hydrates idempotently
    assert service.hydrate(bundle_dir, target) == []

    (target / "entries" / "events.jsonl").write_text("locally changed\n", encoding="utf-8")
    with pytest.raises(ConflictError, match="diverges"):
        service.hydrate(bundle_dir, target)


def test_export_refuses_non_empty_directory(service: BundleService, tmp_path: Path) -> None:
    bundle_dir = tmp_path / "bundle"
    bundle_dir.mkdir()
    (bundle_dir / "junk.txt").write_text("x", encoding="utf-8")
    with pytest.raises(ConflictError):
        service.export(bundle_dir, CONTENT)


# ---------------------------------------------------------------------------
# oras
# ---------------------------------------------------------------------------


def test_oras_argv_is_argument_safe() -> None:
    nasty = "entries/name with spaces;$(rm -rf).json"
    argv = build_push_argv(
        "registry.example/repo:v1",
        artifact_type="application/vnd.gauntlet.bundle.v1+json",
        files=[(nasty, "application/json")],
    )
    # the nasty path stays one argv element; nothing is shell-interpreted
    assert f"{nasty}:application/json" in argv
    assert argv[:2] == ["oras", "push"]


@pytest.mark.parametrize("reference", ["-rf", "repo name", "repo;rm", ""])
def test_oras_rejects_unsafe_references(reference: str) -> None:
    with pytest.raises(InvalidInvocationError):
        build_push_argv(reference, artifact_type="t", files=[("a", "b")])


def test_oras_dry_run_never_executes(service: BundleService, tmp_path: Path) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)
    runner = FakeRunner()
    client = OrasClient(runner, FakeAuthority(), dry_run=True)

    result = service.push(bundle_dir, "registry.example/evidence:v1", client=client)

    assert result.executed is False
    assert runner.calls == []
    assert result.argv[0] == "oras"
    assert "manifest.json:application/vnd.gauntlet.bundle.v1+json" in result.argv


def test_oras_execution_is_authority_gated(service: BundleService, tmp_path: Path) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)
    client = OrasClient(FakeRunner(), FakeAuthority(allowed=False), dry_run=False)
    with pytest.raises(ApprovalRequiredError):
        service.push(bundle_dir, "registry.example/evidence:v1", client=client)


def test_oras_missing_cli_raises_dependency_unavailable(
    service: BundleService, tmp_path: Path
) -> None:
    bundle_dir = tmp_path / "bundle"
    service.export(bundle_dir, CONTENT)
    client = OrasClient(
        FakeRunner(missing_executables={"oras"}), FakeAuthority(), dry_run=False
    )
    with pytest.raises(DependencyUnavailableError, match="oras"):
        service.push(bundle_dir, "registry.example/evidence:v1", client=client)


# ---------------------------------------------------------------------------
# workflow exports (orchestration shape only)
# ---------------------------------------------------------------------------


def test_arazzo_export_is_valid_yaml_with_contract_digests() -> None:
    import yaml

    from gauntlet.adapters.workflow_export import ARAZZO_VERSION, export_arazzo_yaml

    text = export_arazzo_yaml(
        campaign_id="campaign:demo",
        commands=[["gauntlet", "campaign", "start"], ["gauntlet", "evaluate", "search"]],
        contract_digests={"spec": f"sha256:{'ab' * 32}"},
    )
    document = yaml.safe_load(text)
    assert document["arazzo"] == ARAZZO_VERSION
    assert document["info"]["x-gauntlet"]["contract_digests"]["spec"].startswith("sha256:")
    assert "NOT replaced" in document["info"]["x-gauntlet"]["note"]
    steps = document["workflows"][0]["steps"]
    assert [step["stepId"] for step in steps] == ["step_1", "step_2"]


def test_open_workflow_export_declares_sequential_dependencies() -> None:
    from gauntlet.adapters.workflow_export import OWS_SPEC_VERSION, export_open_workflow_json

    document = export_open_workflow_json(
        campaign_id="campaign:demo",
        commands=[["gauntlet", "baseline"], ["gauntlet", "experiment", "run"]],
        contract_digests={"policy": f"sha256:{'cd' * 32}"},
    )
    assert document["specVersion"] == OWS_SPEC_VERSION
    assert document["tasks"][1]["dependsOn"] == ["step_1"]
    assert document["metadata"]["x-gauntlet"]["contract_digests"]["policy"].startswith("sha256:")


def test_workflow_export_requires_commands() -> None:
    from gauntlet.adapters.workflow_export import export_arazzo_yaml

    with pytest.raises(InvalidInvocationError):
        export_arazzo_yaml(campaign_id="campaign:demo", commands=[], contract_digests={})
