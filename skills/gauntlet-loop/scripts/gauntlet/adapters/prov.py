"""W3C PROV serialization for :class:`~gauntlet.models.ProvenanceRecordV1`.

The mapping (PROV-JSON, https://www.w3.org/Submission/prov-json/):

- ``entities``  -> ``entity`` (artifact digests become ``gauntlet:digest``);
- ``activities`` -> ``activity``;
- ``agents``    -> ``agent`` with ``prov:type`` from the actor kind;
- relations (``ProvenanceRecordV1.relations`` items shaped as
  ``{"type": <relation>, "from": <id>, "to": <id>}``) map to:

  ==============  ====================
  relation type   PROV property
  ==============  ====================
  derivation      ``wasDerivedFrom``
  generation      ``wasGeneratedBy``
  usage           ``used``
  attribution     ``wasAttributedTo``
  invalidation    ``wasInvalidatedBy``
  ==============  ====================

``to_prov_jsonld`` wraps the same content with a JSON-LD ``@context``.
"""

from __future__ import annotations

from typing import Any

from gauntlet.errors import InvalidInvocationError
from gauntlet.models import ProvenanceRecordV1

GAUNTLET_PREFIX = "gauntlet"
GAUNTLET_NAMESPACE = "https://gauntlet.dev/prov#"

_RELATION_PROPERTIES = {
    "derivation": ("wasDerivedFrom", "prov:generatedEntity", "prov:usedEntity"),
    "generation": ("wasGeneratedBy", "prov:entity", "prov:activity"),
    "usage": ("used", "prov:activity", "prov:entity"),
    "attribution": ("wasAttributedTo", "prov:entity", "prov:agent"),
    "invalidation": ("wasInvalidatedBy", "prov:entity", "prov:activity"),
}


def _qualified(identifier: str) -> str:
    return f"{GAUNTLET_PREFIX}:{identifier.replace(':', '_')}"


def to_prov_json(record: ProvenanceRecordV1) -> dict[str, Any]:
    """Serialize a provenance record as a PROV-JSON document."""
    entity: dict[str, Any] = {}
    for artifact in record.entities:
        entity[_qualified(artifact.artifact_id)] = {
            "gauntlet:digest": artifact.digest.digest,
            "gauntlet:role": artifact.role.value,
            **(
                {"gauntlet:mediaType": artifact.digest.media_type}
                if artifact.digest.media_type
                else {}
            ),
        }
    activity: dict[str, Any] = {
        _qualified(name): {"gauntlet:activity": name} for name in record.activities
    }
    agent: dict[str, Any] = {}
    for actor in record.agents:
        agent[_qualified(actor.actor_id)] = {
            "prov:type": f"gauntlet:{actor.kind}",
            **({"gauntlet:displayName": actor.display_name} if actor.display_name else {}),
        }
    document: dict[str, Any] = {
        "prefix": {
            GAUNTLET_PREFIX: GAUNTLET_NAMESPACE,
            "prov": "http://www.w3.org/ns/prov#",
        },
        "entity": entity,
        "activity": activity,
        "agent": agent,
    }
    for index, relation in enumerate(record.relations):
        relation_type = relation.get("type")
        source = relation.get("from")
        target = relation.get("to")
        if relation_type not in _RELATION_PROPERTIES or not source or not target:
            raise InvalidInvocationError(
                f"malformed provenance relation at index {index}: {relation!r}",
                hint="relations need type in {derivation, generation, usage, "
                "attribution, invalidation} plus 'from' and 'to' ids",
            )
        prov_property, from_key, to_key = _RELATION_PROPERTIES[relation_type]
        document.setdefault(prov_property, {})[f"_:r{index}"] = {
            from_key: _qualified(source),
            to_key: _qualified(target),
        }
    return document


def to_prov_jsonld(record: ProvenanceRecordV1) -> dict[str, Any]:
    """Serialize as PROV-flavoured JSON-LD (same content, with @context)."""
    document = to_prov_json(record)
    prefixes = document.pop("prefix")
    return {
        "@context": {
            **prefixes,
            "@vocab": "http://www.w3.org/ns/prov#",
        },
        "@id": _qualified(record.record_id),
        "@type": "prov:Bundle",
        "prov:generatedAtTime": record.created_at,
        **document,
    }
