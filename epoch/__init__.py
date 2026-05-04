"""Epoch: a minimal event-driven DVCS prototype."""

from .core import Event, EpochRepository
from .crdt import CRDTRegistry, JsonMapCRDT, TextWeaveCRDT

__all__ = [
    "CRDTRegistry",
    "EpochRepository",
    "Event",
    "JsonMapCRDT",
    "TextWeaveCRDT",
]
