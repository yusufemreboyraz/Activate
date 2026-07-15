// stores/workspaceStore.ts

import { create } from 'zustand';

export interface SlackWorkspace {
  workspace_id: string;
  workspace_name: string;
  status?: string;
}

interface WorkspaceState {
  workspaces: SlackWorkspace[];
  selectedWorkspaceId: string | null;
  isLoadingWorkspaces: boolean;
  fetchWorkspaces: () => Promise<void>;
  setSelectedWorkspaceId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  selectedWorkspaceId: null, // Always initialize as null to prevent hydration errors
  isLoadingWorkspaces: false,
  setSelectedWorkspaceId: (id) => {
    set({ selectedWorkspaceId: id });
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('selected-workspace-id', id);
      } else {
        localStorage.removeItem('selected-workspace-id');
      }
    }
  },
  fetchWorkspaces: async () => {
    if (get().isLoadingWorkspaces) return;
    set({ isLoadingWorkspaces: true });
    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) throw new Error(`Failed to fetch workspaces: ${response.status}`);
      const fetchedWorkspaces: SlackWorkspace[] = await response.json();

      set({ workspaces: fetchedWorkspaces, isLoadingWorkspaces: false });

      if (!get().selectedWorkspaceId && fetchedWorkspaces.length > 0) {
        const defaultId = fetchedWorkspaces[0].workspace_id;
        get().setSelectedWorkspaceId(defaultId);
      }
    } catch (error) {
      console.error('Error fetching workspaces: ', error);
      set({ isLoadingWorkspaces: false, workspaces: [] });
    }
  },
}));
