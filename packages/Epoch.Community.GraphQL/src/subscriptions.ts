import type { ProjectionDelta } from "@epoch/community-core";

export async function* projectionDeltaEvents(
  stream: AsyncIterable<ProjectionDelta>,
  signal?: AbortSignal,
): AsyncIterable<{ readonly projectionDeltas: ProjectionDelta }> {
  for await (const delta of stream) {
    if (signal?.aborted === true) return;
    yield { projectionDeltas: delta };
  }
}
