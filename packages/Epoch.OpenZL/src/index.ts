/** @epoch/openzl public API (ADR-0053). */
export {
  OPENZL_CODEC_ID,
  OPENZL_FRAME_FORMAT,
  compressChangediff,
  compressChunkBytes,
  compressOpenZl,
  decompressOpenZl,
  isOpenZlFrame,
  openZlHostCodec,
  preferOpenZlCompression,
  prepareForEntropy,
  profileForEntityType,
  type HostCodec,
  type OpenZlCompressOptions,
  type OpenZlCompressResult,
  type OpenZlFrameHeader,
  type OpenZlProfile,
} from "./codec-core";

export {
  decodeObjectFromSync,
  encodeObjectForSync,
  type SyncV2ObjectBytes,
} from "./sync";

export {
  registerOpenZlCodec,
  type CapabilityRegistryLike,
} from "./register";
