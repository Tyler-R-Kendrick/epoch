# Artifact store

Content-addressed storage. `manifests/` (tracked) holds immutable artifact
manifests: digests, media types, provenance, and parent-transform
references. `blobs/` and `staging/` (ignored) hold payload bytes addressed
by SHA-256 digest. Identity is always the digest, never a filename.
