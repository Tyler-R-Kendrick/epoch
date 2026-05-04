export interface EpochWasmGitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export class EpochWasmGitUnsupportedOperationError extends Error {
  constructor(operation: string, reason: string) {
    super(`git ${operation} is not supported by Epoch WASM Git compatibility: ${reason}`);
    this.name = "EpochWasmGitUnsupportedOperationError";
  }
}

export class EpochWASMGit {
  static execute(command: string): EpochWasmGitCommandResult {
    throw new EpochWasmGitUnsupportedOperationError(command, "native Git repository access is unavailable in the WASM runtime; use the Core or CLI Git package on a host filesystem");
  }

  static clone(remote: string): never {
    throw new EpochWasmGitUnsupportedOperationError("clone", `native Git clone is unavailable in the WASM runtime for ${remote}`);
  }
}
