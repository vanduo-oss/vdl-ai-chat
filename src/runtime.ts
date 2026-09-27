/** Runtime operations that must stay outside conversation and UI state. */
export function cancelRuntime(conversation: any, engine: any): void {
  try {
    conversation?.cancel?.();
  } catch {
    /* device may already be lost */
  }
  try {
    engine?.interruptGenerate?.();
    engine?.cancel?.();
  } catch {
    /* device may already be lost */
  }
}

export async function disposeRuntime(conversation: any, engine: any): Promise<void> {
  try {
    await conversation?.delete?.();
  } catch {
    /* already lost */
  }
  try {
    if (engine?.delete) await engine.delete();
    else if (engine?.dispose) await engine.dispose();
    else await engine?.unload?.();
  } finally {
    engine?.terminateWorker?.();
  }
}
