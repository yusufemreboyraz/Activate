"use client"; // Client-side rendering için gerekli

import { useEffect, useState } from 'react';
import { userStatusToDataTableSchema } from '@/components/data-table';
import type { z } from 'zod';

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

// Zustand store importu
import { useWorkspaceStore } from '@/stores/workspaceStore';

// UserStatus için TypeScript interface'i (API route'ların JSON yanıtıyla uyumlu)
export interface UserStatus {
  id: string; // Slack user ID
  user_id: string;
  workspace_id: string;
  name: string;
  status_text?: string;
  status_emoji?: string;
  status_expiration?: number;
  real_name?: string;
  display_name?: string;
  image_original?: string;
  updated_at: string; // ISO date string
  presence?: 'active' | 'away' | string;
}

// data-table.tsx'deki Zod şemasından DataTable'ın beklediği tipi alacağız.
// Bu tip, totalActiveToday alanını içerecek şekilde güncellenecek.
// Şimdilik MappedUserStatus olarak adlandıralım, data-table.tsx'deki schema güncellenince bu da uyumlu olacak.
type MappedUserStatusWithActiveTime = z.infer<typeof import('@/components/data-table').schema> & { totalActiveToday?: string };

export default function HomePage() {
  const [originalUserStatuses, setOriginalUserStatuses] = useState<UserStatus[]>([]);
  const [mappedDataForTable, setMappedDataForTable] = useState<MappedUserStatusWithActiveTime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand store'dan seçili workspace ID'sini al
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const workspacesLoading = useWorkspaceStore((state) => state.isLoadingWorkspaces);

  useEffect(() => {
    const fetchData = async () => {
      if (workspacesLoading) {
        setIsLoading(true); 
        setOriginalUserStatuses([]);
        setMappedDataForTable([]);
        // console.log("HomePage: Workspaces are loading, waiting...");
        return;
      }
      
      if (!selectedWorkspaceId) {
        setIsLoading(false);
        // setError("Lütfen bir çalışma alanı seçin."); // Bu mesajı SectionCards veya DataTable içinde gösterebiliriz.
        setOriginalUserStatuses([]);
        setMappedDataForTable([]);
        // console.log("HomePage: No workspace selected.");
        return;
      }

      setIsLoading(true);
      setError(null);
      // console.log(`HomePage: Fetching data for workspace ID: ${selectedWorkspaceId}`);

      try {
        const response = await fetch(`/api/user-statuses?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`);
        if (!response.ok) throw new Error(`Failed to fetch user statuses: ${response.status}`);
        const statusesData: (UserStatus & { totalActiveToday: string })[] = await response.json();

        setOriginalUserStatuses(statusesData);

        const resolvedTableData = statusesData.map((status) => ({
          ...userStatusToDataTableSchema(status),
          totalActiveToday: status.totalActiveToday,
        }));
        setMappedDataForTable(resolvedTableData);

      } catch (err) {
        console.error(`Error fetching data for workspace ${selectedWorkspaceId}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(errorMessage);
        setOriginalUserStatuses([]);
        setMappedDataForTable([]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [selectedWorkspaceId, workspacesLoading]);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="grid grid-cols-1 gap-4 @container">
              <SectionCards 
                userStatuses={originalUserStatuses}
                isLoading={isLoading} 
                error={error} 
            />
              </div>
              {/* <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div> */}
              <DataTable 
                data={mappedDataForTable} 
                isLoading={isLoading} 
                error={error} 
              /> 
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
