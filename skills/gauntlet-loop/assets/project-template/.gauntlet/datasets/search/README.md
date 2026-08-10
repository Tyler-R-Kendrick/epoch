# Search split

Discovery cases visible to candidate builders. Used by `gauntlet evaluate
search` to find repairs. Never reuse these cases for promotion decisions;
the splits must stay disjoint (`gauntlet audit leakage` verifies).
