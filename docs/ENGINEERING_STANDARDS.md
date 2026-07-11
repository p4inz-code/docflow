# Docflow Engineering Standards

> Repository law — Permanent engineering rules extracted from release hardening sessions.
> Every engineer must read and follow these standards before contributing.

---

## 1. Resource Lifecycle

### Rule R1: Every resource must have an owner

```
export class SomeManager {
  private _ownedResource: SomeResource;

  constructor() {
    this._ownedResource = new SomeResource();
  }
}
```

Every `setInterval`, `setTimeout`, `requestAnimationFrame`, `AbortController`, event listener, Observer, and Blob URL must be assigned to a single owner that is responsible for its cleanup.

### Rule R2: Every resource must have deterministic cleanup

Every class that allocates resources must implement one of:
- `dispose()` — for imperative cleanup
- `destroy()` — for imperative cleanup (legacy compatibility)
- A React `useEffect` cleanup function — for component-scoped resources

Example:
```typescript
useEffect(() => {
  const ac = new AbortController();
  doWork(ac.signal);
  return () => ac.abort(); // CLEANUP
}, []);
```

### Rule R3: Every Blob URL must be revoked

```typescript
// GOOD
const url = URL.createObjectURL(file);
// ... use url ...
URL.revokeObjectURL(url);

// BETTER (tracked cleanup)
const blobUrlRef = useRef<string | null>(null);
blobUrlRef.current = URL.createObjectURL(file);
useEffect(() => {
  return () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  };
}, []);
```

**Do NOT** create a Blob URL without a matching `revokeObjectURL` call.

### Rule R4: Every event listener must have cleanup

```typescript
// GOOD
useEffect(() => {
  const handler = () => { ... };
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}, []);

// GOOD (one-shot, auto-removes)
element.addEventListener("change", handler, { once: true });
```

If you use `addEventListener`, you **must** pair it with `removeEventListener` or use `{ once: true }`.

### Rule R5: Every Observer must be disconnected

```typescript
// GOOD
const observer = new IntersectionObserver(...);
observer.observe(element);
// Cleanup:
observer.disconnect();
```

## 2. Error Handling

### Rule E1: Every error must route through GlobalErrorManager

```typescript
// GOOD
import { viewerErrorHandler } from "../core/ErrorManager";
viewerErrorHandler.error("Render PDF", `Failed: ${err.message}`);

// BAD — bypasses error pipeline
console.error("Failed to render PDF:", err);
```

Do not use raw `console.error`, `console.warn`, or `console.log` directly in production code. The ONLY exception is in `ErrorManager.ts` itself and `main.tsx`'s global unhandled-rejection handler.

### Rule E2: Empty catch blocks are forbidden

```typescript
// BAD — silent swallow
} catch {
  // skip
}

// GOOD — at minimum, document the reason
} catch {
  // Non-fatal: thumbnail render failures are skipped silently
}

// BEST — route through error pipeline
} catch (err) {
  renderingErrorHandler.warn("Thumbnail Render",
    `Failed: ${err instanceof Error ? err.message : String(err)}`);
}
```

### Rule E3: Every async operation must handle rejection

```typescript
// BAD — unhandled promise
someAsyncOp();

// GOOD
void someAsyncOp(); // intentionally fire-and-forget

// BETTER
await someAsyncOp(); // properly awaited
```

### Rule E4: Concurrent save/export must be guarded

```typescript
// GOOD
private _saving = false;

async save(): Promise<void> {
  if (this._saving) return; // reject concurrent saves
  this._saving = true;
  try {
    await doSave();
  } finally {
    this._saving = false;
  }
}
```

Every operation that modifies persistent state (save, export, import) must guard against concurrent execution.

## 3. State Management

### Rule S1: Single source of truth

Every piece of state must exist in exactly one location:
- **Zustand store** for cross-component shared state
- **React local state** for component-private UI state
- **Ref** for mutable values that don't trigger re-renders

**Do NOT** duplicate the same state in multiple locations.

### Rule S2: No duplicate keyboard handlers

Keyboard shortcuts are registered in exactly one place: `KeyboardShortcuts.ts` (managed by `keyboardShortcuts.attach()` in `App.tsx`).

If a component needs component-specific shortcuts (e.g., Ctrl+F for search), it must register and clean up its own handler, and must NOT re-register the global shortcuts.

### Rule S3: No duplicate scroll detection

Scroll position → active page sync is handled by `PDFViewer.tsx`. The zustand store (`useEditorStore.setActivePage`) is the single source of truth for active page. Components that need the active page read from the store.

## 4. Architecture

### Rule A1: Singleton managers must implement dispose

Every manager exported as a singleton (`export const x = new X()`):
- Must implement a `dispose()` method
- Must track owned resources
- Must be cleanable

### Rule A1a: Lazy singleton initialization

```typescript
// AVOID — eager initialization at module load
class MyManager { constructor() { /* may throw */ } }
export const manager = new MyManager();

// PREFER — lazy initialization on first access
let _instance: MyManager | null = null;
export function getMyManager(): MyManager {
  if (!_instance) _instance = new MyManager();
  return _instance;
}
```

Module-level singleton construction can fail silently if the constructor throws. Use lazy initialization for any manager whose constructor performs non-trivial work.

### Rule A2: No duplicate abstractions

If two classes solve the same problem:
- Consolidate into one
- Remove the weaker one
- Add barrel exports for backward compatibility if needed

### Rule A3: All commands must be undoable

Every `Command` subclass must:
- Store enough state in `execute()` to reverse the operation
- Implement `undo()` that fully restores the previous state
- Return a `CommandResult` that accurately describes what changed

## 5. Testing

### Rule T1: Every public API requires regression tests

New feature, bug fix, or refactoring → regression test. No exceptions.

### Rule T2: Every bug fix must include justification for why it won't recur

After fixing a bug, answer these questions in the PR:
1. How could this bug happen again?
2. What prevents recurrence?
3. Is there a test covering this scenario?

## 6. Build & Validation

### Rule B1: Fresh clone validation

Every PR must be verified against a fresh clone:
```bash
git clone <repo>
pnpm install
pnpm verify   # typecheck + lint + test
pnpm build
```

### Rule B2: No weakening of compiler/lint settings

Never:
- Add `// @ts-ignore` or `// @ts-expect-error`
- Add `as any` or `as unknown as` without a `// justified: <reason>` comment on the same line
- Remove `noUnusedLocals` or `noUnusedParameters`
- Remove `strict` or equivalent settings
- Suppress lint rules

Every unsafe cast must be paired with a documented justification. Example:
```typescript
const x = obj as unknown as MyType; // justified: pdfjs-dist types are incomplete
```

### Rule B2a: No stale TODO/FIXME/HACK at merge time

- Every `// TODO`, `// FIXME`, or `// HACK` comment must reference a tracking issue
- No unresolved TODO/FIXME may exist in code merged to `main`
- Use `// TODO(username): YYYY-MM-DD: description` format when a quick fix is deferred

### Rule B3: No console.log in production code

All debug output must be:
- Removed before committing, OR
- Behind `if (process.env.NODE_ENV !== "production")` guards, OR
- Routed through `GlobalErrorManager` which handles environment gating

## 7. Cleanup Checklist

Before closing a file, verify:
- [ ] Every Blob URL has a matching `revokeObjectURL`
- [ ] Every event listener has `removeEventListener` or `{ once: true }`
- [ ] Every interval/timeout has `clearInterval`/`clearTimeout`
- [ ] Every `AbortController` has `.abort()` called in cleanup
- [ ] Every Observer is disconnected
- [ ] Every `console.*` call is replaced with error pipeline or behind env guard
- [ ] Every empty catch block has a justification comment
- [ ] Every `as any` cast is justified
- [ ] No stale `// TODO`, `// FIXME`, `// HACK` comments

## 8. File Deletion Protocol

Before deleting any file:
1. Search the entire repository for imports of this file
2. Update or remove all references
3. Verify the build still passes
4. Run the full test suite

## 9. Adding New Manager Classes

Every new manager class must document:
- What resources it allocates
- How those resources are cleaned up
- Whether it implements `dispose()`
- Whether it should be a singleton or instance-based
- Its lifecycle relative to the application
