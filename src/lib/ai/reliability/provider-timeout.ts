export class ProviderTimeout {
  static async withTimeout<T>(
    promiseFn: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number = 60000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await promiseFn(controller.signal);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`AI Provider request timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
