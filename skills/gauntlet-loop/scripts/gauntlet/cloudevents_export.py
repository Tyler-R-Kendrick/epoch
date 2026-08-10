"""CloudEvents 1.0 export via the official SDK (portable envelopes only).

Maps ledger/graph records onto :class:`~gauntlet.models.GauntletCloudEventV1`
and onto official-SDK ``CloudEvent`` objects using the namespaced event types
in :data:`gauntlet.constants.CLOUDEVENT_TYPES`. JSON serialization goes
through the SDK's ``JSONFormat`` so exports always validate against the
CloudEvents 1.0 JSON format.

CloudEvents is an export/interchange envelope. The internal runtime source of
truth stays in ActiveGraph; nothing here creates authority.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from cloudevents.core.formats.json import JSONFormat
from cloudevents.core.v1.event import CloudEvent

from gauntlet.constants import CLOUDEVENT_TYPES
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import GauntletCloudEventV1, GauntletModel
from gauntlet.support import Clock, IdGenerator

DEFAULT_SOURCE = "urn:dev.gauntlet:project"

_FORMAT = JSONFormat()


def _parse_rfc3339(value: str) -> datetime:
    text = value.removesuffix("Z")
    pattern = "%Y-%m-%dT%H:%M:%S.%f" if "." in text else "%Y-%m-%dT%H:%M:%S"
    return datetime.strptime(text, pattern).replace(tzinfo=UTC)


def _format_rfc3339(value: datetime) -> str:
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def build_event(
    event_type: str,
    data: dict[str, Any],
    *,
    clock: Clock,
    ids: IdGenerator,
    source: str = DEFAULT_SOURCE,
    subject: str | None = None,
) -> GauntletCloudEventV1:
    """Build a portable gauntlet CloudEvent envelope for one payload."""
    if event_type not in CLOUDEVENT_TYPES:
        raise InvalidInvocationError(
            f"unknown gauntlet CloudEvent type: {event_type!r}",
            hint="use one of gauntlet.constants.CLOUDEVENT_TYPES",
        )
    return GauntletCloudEventV1(
        id=ids.new_id("ce"),
        source=source,
        type=event_type,
        time=clock.now(),
        subject=subject,
        data=data,
    )


def event_for_record(
    event_type: str,
    record: GauntletModel,
    *,
    clock: Clock,
    ids: IdGenerator,
    source: str = DEFAULT_SOURCE,
    subject: str | None = None,
) -> GauntletCloudEventV1:
    """Wrap any persisted gauntlet record as CloudEvent data."""
    return build_event(
        event_type,
        record.model_dump(mode="json"),
        clock=clock,
        ids=ids,
        source=source,
        subject=subject,
    )


def to_sdk_event(event: GauntletCloudEventV1) -> CloudEvent:
    """Convert the envelope into an official-SDK ``CloudEvent``."""
    attributes: dict[str, Any] = {
        "id": event.id,
        "source": event.source,
        "type": event.type,
        "specversion": event.specversion,
        "time": _parse_rfc3339(event.time),
        "datacontenttype": event.datacontenttype,
    }
    if event.subject is not None:
        attributes["subject"] = event.subject
    return CloudEvent(attributes, dict(event.data))


def from_sdk_event(sdk_event: CloudEvent) -> GauntletCloudEventV1:
    """Convert an official-SDK ``CloudEvent`` back into the envelope."""
    time_value = sdk_event.get_time()
    if time_value is None:
        raise InvalidInvocationError("gauntlet CloudEvents require the time attribute")
    data = sdk_event.get_data()
    if data is not None and not isinstance(data, dict):
        raise InvalidInvocationError("gauntlet CloudEvents carry JSON object data")
    return GauntletCloudEventV1(
        id=sdk_event.get_id(),
        source=sdk_event.get_source(),
        type=sdk_event.get_type(),
        time=_format_rfc3339(time_value),
        subject=sdk_event.get_subject(),
        datacontenttype=sdk_event.get_datacontenttype() or "application/json",
        data=dict(data) if data else {},
    )


def write_json(event: GauntletCloudEventV1) -> bytes:
    """Serialize through the official SDK's JSON format."""
    return _FORMAT.write(to_sdk_event(event))


def read_json(data: bytes) -> GauntletCloudEventV1:
    """Parse SDK-formatted JSON back into the gauntlet envelope."""
    sdk_event = _FORMAT.read(CloudEvent, data)
    if not isinstance(sdk_event, CloudEvent):  # pragma: no cover - SDK contract
        raise InvalidInvocationError("unexpected CloudEvent implementation from the SDK")
    return from_sdk_event(sdk_event)
