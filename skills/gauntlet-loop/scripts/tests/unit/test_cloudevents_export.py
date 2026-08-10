"""CloudEvents SDK round-trip validation for every gauntlet event type."""

from __future__ import annotations

import json

import pytest

from gauntlet.cloudevents_export import (
    build_event,
    event_for_record,
    read_json,
    to_sdk_event,
    write_json,
)
from gauntlet.constants import CLOUDEVENT_TYPES
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import ObservationV1, ToolRefV1
from gauntlet.support import FrozenClock, SequentialIdGenerator


@pytest.mark.parametrize("event_type", CLOUDEVENT_TYPES)
def test_every_event_type_round_trips_through_the_sdk(
    event_type: str, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    event = build_event(
        event_type,
        {"sample": True, "event_type": event_type},
        clock=clock,
        ids=ids,
        subject="campaign:demo",
    )

    payload = write_json(event)
    restored = read_json(payload)

    assert restored == event
    document = json.loads(payload)
    assert document["specversion"] == "1.0"
    assert document["type"] == event_type
    assert document["data"] == {"sample": True, "event_type": event_type}


def test_unknown_event_type_is_rejected(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    with pytest.raises(InvalidInvocationError):
        build_event("dev.gauntlet.made-up.v1", {}, clock=clock, ids=ids)


def test_record_export_wraps_model_dump(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    observation = ObservationV1(
        observation_id="obs:000001",
        producer=ToolRefV1(name="gauntlet-import"),
        scope="trace-import",
        raw_digest={"value": "ab" * 32},
        measured_at=clock.now(),
    )
    event = event_for_record(
        "dev.gauntlet.observation.recorded.v1", observation, clock=clock, ids=ids
    )
    assert event.data["observation_id"] == "obs:000001"

    sdk_event = to_sdk_event(event)
    assert sdk_event.get_type() == "dev.gauntlet.observation.recorded.v1"
    assert read_json(write_json(event)) == event
