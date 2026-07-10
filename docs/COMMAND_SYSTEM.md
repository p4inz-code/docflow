# Docflow Command System

## Architecture

Docflow uses the classic GoF **Command Pattern** for all undoable operations. Every user action that modifies document state is encapsulated as a Command object that knows how to execute and undo itself.

## Components

### Command Interface
```
{
  id: string           — unique instance ID
  type: CommandType    — discriminant (create, delete, move, etc.)
  label: string        — human-readable name for undo/redo UI
  timestamp: number    — when the command was first executed
  execute(): CommandResult
  undo(): CommandResult
  canMerge?: boolean   — whether this command can merge with previous
  merge?(prev): void   — merge this command into previous
}
```

### CommandManager
Responsible for executing commands and forwarding results to the HistoryManager. The CommandManager doesn't know about history — it just runs commands and notifies listeners.

### HistoryManager
Maintains undo/redo stacks. When a command is executed:
1. It's pushed onto the undo stack
2. The redo stack is cleared (new action invalidates redo)
3. On undo: command is popped from undo, undone, pushed to redo
4. On redo: command is popped from redo, re-executed, pushed to undo

### CommandPipeline
The bridge between Command execution and History tracking:
- Wires CommandManager.onExecute to HistoryManager.push
- Handles command merging during drags (consecutive MoveObject commands)
- Tracks dirty state based on history depth
- Notifies editor store on history changes

## Concrete Commands

| Command | Type | Description |
|---------|------|-------------|
| CreateObjectCommand | create-object | Add a new editable object |
| CreateTextCommand | create-object | Add a new text object |
| DeleteObjectCommand | delete-object | Remove selected objects |
| MoveObjectCommand | move-object | Change position (mergeable during drag) |
| ResizeObjectCommand | resize-object | Change size (mergeable during drag) |
| RotateObjectCommand | rotate-object | Change rotation (mergeable during drag) |
| EditTextCommand | edit-text | Modify text content |
| EditPropertiesCommand | change-style | Modify style properties |
| DuplicateCommand | duplicate | Clone selected objects |
| ZOrderCommand | — | Bring to front / send to back |

## Command Result

Every command returns a `CommandResult` describing what changed:
```
{
  created: string[]        — IDs of new objects
  deleted: string[]        — IDs of removed objects
  updated: string[]        — IDs of modified objects
  selectionChanged: string[] — IDs with selection state changes
  needsRender: boolean     — whether full re-render is needed
}
```

## Menu & Palette Integration

All menu actions and command palette entries route through the CommandPipeline:
- **MenuBar** builds menu definitions that call `commandPipeline.execute()` etc.
- **CommandPalette** builds command entries with the same actions
- **KeyboardShortcuts** handles keyboard bindings that execute identical commands

This ensures no duplicated logic — the same Command instance handles menu, palette, and keyboard triggers.
