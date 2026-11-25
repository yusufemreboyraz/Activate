'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore'; // Store dosyanızın yolu

export function WorkspaceInitializer() {
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  // Fetch once per page load; an empty list is a valid answer, not a reason to refetch.
  const workspacesLoaded = useWorkspaceStore((state) => state.hasFetchedWorkspaces);
  const isLoading = useWorkspaceStore((state) => state.isLoadingWorkspaces);
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId);

  // This effect runs only once on mount to hydrate the store from localStorage.
  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem('selected-workspace-id');
    if (savedWorkspaceId) {
      setSelectedWorkspaceId(savedWorkspaceId);
    }
    // This effect should run only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures it runs once on mount.

  // This effect handles fetching the list of workspaces if they aren't already loaded.
  useEffect(() => {
    if (!workspacesLoaded && !isLoading) {
      fetchWorkspaces();
    }
  }, [fetchWorkspaces, workspacesLoaded, isLoading]);

  return null; // This component does not render anything.
} 