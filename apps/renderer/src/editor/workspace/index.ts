export { useWorkspaceStore, useActiveDocument, useActivePDF, useIsActiveDocument } from "./WorkspaceStore";
export type { WorkspaceDocument, WorkspaceState } from "./WorkspaceStore";
export { WorkspaceManager, workspaceManager } from "./WorkspaceManager";
export { TabManager, tabManager } from "./TabManager";
export type { TabCloseResult, TabCloseHandler } from "./TabManager";
export { RecentWorkspace, recentWorkspace } from "./RecentWorkspace";
export type { SessionDocument, WorkspaceSession } from "./RecentWorkspace";
