"use client"

import * as React from "react"
import {
  IconBrandSlack,
  IconDashboard,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useWorkspaceStore } from "@/stores/workspaceStore"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
  ],
  // Shown to app admins only (ADMIN_EMAILS); the route checks it as well.
  adminNav: [
    {
      title: "Slack workspace bağla",
      url: "/api/slack/install",
      icon: IconBrandSlack,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId)
  const isLoadingWorkspaces = useWorkspaceStore((state) => state.isLoadingWorkspaces)
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => setIsAdmin(Boolean(me?.isAdmin)))
      .catch(() => setIsAdmin(false))
  }, [])

  const selectedWorkspaceName = React.useMemo(() => {
    if (isLoadingWorkspaces) return "Yükleniyor...";
    if (!selectedWorkspaceId && workspaces.length > 0) return "Çalışma Alanı Seçin...";
    if (!selectedWorkspaceId && workspaces.length === 0 && !isLoadingWorkspaces) return "Erişebildiğin workspace yok";
    const workspace = workspaces.find(ws => ws.workspace_id === selectedWorkspaceId);
    return workspace ? workspace.workspace_name : "Çalışma Alanı Seçin...";
  }, [selectedWorkspaceId, workspaces, isLoadingWorkspaces]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="p-2.5">
        <Select
          value={selectedWorkspaceId ?? ""}
          onValueChange={(value) => {
            setSelectedWorkspaceId(value || null);
          }}
          disabled={isLoadingWorkspaces || workspaces.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={selectedWorkspaceName} />
          </SelectTrigger>
          <SelectContent>
            {workspaces.length === 0 && !isLoadingWorkspaces && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Slack e-postan bağlı bir workspace&apos;in üyeleri arasında görünmüyor.
              </div>
            )}
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.workspace_id} value={workspace.workspace_id}>
                {workspace.workspace_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {isAdmin && <NavSecondary items={data.adminNav} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
