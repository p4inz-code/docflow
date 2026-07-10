/**
 * id.ts — ID Generation
 *
 * Purpose: Abstract ID generation so we can swap implementations
 * (crypto.randomUUID, nanoid, etc.) without touching every call site.
 *
 * Currently uses the global crypto.randomUUID() which is available
 * in modern browsers and Electron's Chromium runtime.
 */

/**
 * Generate a unique identifier string.
 * Uses the Web Crypto API's randomUUID method.
 * In the future this could be replaced with nanoid for shorter IDs.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
