"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Trash2, RefreshCw, Package, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pluginsApi } from "@/lib/api/players";
import toast from "react-hot-toast";

type Source = "modrinth" | "spiget";

export function PluginsTab({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"installed" | "search">("installed");
  const [source, setSource] = useState<Source>("modrinth");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: installed, isLoading: installedLoading } = useQuery({
    queryKey: ["plugins-installed", serverId],
    queryFn: () => pluginsApi.getInstalled(serverId).then((r) => r.data),
  });

  const { data: searchResults, isLoading: searching, refetch: doSearch } = useQuery({
    queryKey: ["plugins-search", source, searchQuery],
    queryFn: () => source === "modrinth" ? pluginsApi.modrinthSearch(searchQuery).then((r) => r.data) : pluginsApi.spigetSearch(searchQuery).then((r) => r.data),
    enabled: false,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    doSearch();
  };

  const removeMutation = useMutation({
    mutationFn: (fileName: string) => pluginsApi.remove(serverId, fileName),
    onSuccess: () => { toast.success("Plugin removed"); queryClient.invalidateQueries({ queryKey: ["plugins-installed", serverId] }); },
    onError: () => toast.error("Failed to remove plugin"),
  });

  const installModrinthMutation = useMutation({
    mutationFn: (data: { projectId: string; versionId: string }) => pluginsApi.installModrinth(serverId, data),
    onSuccess: () => { toast.success("Plugin installed!"); queryClient.invalidateQueries({ queryKey: ["plugins-installed", serverId] }); },
    onError: () => toast.error("Install failed"),
  });

  const installSpigetMutation = useMutation({
    mutationFn: (resourceId: number) => pluginsApi.installSpiget(serverId, { resourceId }),
    onSuccess: () => { toast.success("Plugin installed!"); queryClient.invalidateQueries({ queryKey: ["plugins-installed", serverId] }); },
    onError: () => toast.error("Install failed"),
  });

  const updateAllMutation = useMutation({
    mutationFn: () => pluginsApi.updateAll(serverId),
    onSuccess: () => { toast.success("All plugins updated"); queryClient.invalidateQueries({ queryKey: ["plugins-installed", serverId] }); },
    onError: () => toast.error("Update failed"),
  });

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setActiveView("installed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "installed" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/70"}`}>
          Installed {installed ? `(${installed.length})` : ""}
        </button>
        <button onClick={() => setActiveView("search")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "search" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/70"}`}>
          Search & Install
        </button>
        {activeView === "installed" && installed && installed.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => updateAllMutation.mutate()} disabled={updateAllMutation.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${updateAllMutation.isPending ? "animate-spin" : ""}`} /> Update All
          </Button>
        )}
      </div>

      {activeView === "installed" ? (
        <div className="space-y-2">
          {installedLoading ? (
            <GlassCard className="p-8 text-center text-sm text-muted-foreground">Loading plugins...</GlassCard>
          ) : installed && installed.length > 0 ? (
            installed.map((plugin) => (
              <GlassCard key={plugin.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center"><Package className="w-5 h-5 text-neon-purple" /></div>
                    <div>
                      <p className="font-medium text-sm">{plugin.name}</p>
                      <p className="text-xs text-muted-foreground">{plugin.version || "Unknown version"} &middot; {plugin.fileName}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remove ${plugin.name}?`)) removeMutation.mutate(plugin.fileName); }}
                    className="text-neon-red hover:text-neon-red"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </GlassCard>
            ))
          ) : (
            <GlassCard className="p-12 text-center">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No plugins installed.</p>
            </GlassCard>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSource("modrinth")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${source === "modrinth" ? "bg-neon-green/10 text-neon-green" : "text-muted-foreground"}`}>
              Modrinth
            </button>
            <button onClick={() => setSource("spiget")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${source === "spiget" ? "bg-neon-orange/10 text-neon-orange" : "text-muted-foreground"}`}>
              Spiget
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${source} plugins...`} className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <Button size="sm" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>

          {searchResults && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(source === "modrinth" ? (searchResults.hits || []) : (Array.isArray(searchResults) ? searchResults : [])).map((result: any) => (
                <ModrinthOrSpigetResult key={result.project_id || result.slug || result.id} result={result} source={source}
                  onInstallModrinth={(projectId, versionId) => installModrinthMutation.mutate({ projectId, versionId })}
                  onInstallSpiget={(resourceId) => installSpigetMutation.mutate(resourceId)}
                  installing={installModrinthMutation.isPending || installSpigetMutation.isPending} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModrinthOrSpigetResult({ result, source, onInstallModrinth, onInstallSpiget, installing }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any; source: Source;
  onInstallModrinth: (projectId: string, versionId: string) => void;
  onInstallSpiget: (resourceId: number) => void;
  installing: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [versions, setVersions] = useState<any[] | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const handleInstall = async () => {
    if (source === "spiget") {
      onInstallSpiget(result.id);
      return;
    }
    // Modrinth: need to fetch versions first
    if (!versions) {
      setLoadingVersions(true);
      try {
        const { data } = await pluginsApi.modrinthVersions(result.project_id || result.slug);
        setVersions(data);
        if (data.length > 0) {
          onInstallModrinth(result.project_id || result.slug, data[0].id);
        }
      } catch {
        toast.error("Failed to fetch versions");
      } finally {
        setLoadingVersions(false);
      }
    } else if (versions.length > 0) {
      onInstallModrinth(result.project_id || result.slug, versions[0].id);
    }
  };

  const title = source === "modrinth" ? result.title : result.name;
  const desc = source === "modrinth" ? result.description : result.tag;
  const downloads = source === "modrinth" ? result.downloads : result.downloads?.total;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {result.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(result.icon_url)} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
            {downloads !== undefined && <p className="text-xs text-muted-foreground">{Number(downloads).toLocaleString()} downloads</p>}
          </div>
        </div>
        <Button size="sm" onClick={handleInstall} disabled={installing || loadingVersions}>
          {loadingVersions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" /> Install</>}
        </Button>
      </div>
    </GlassCard>
  );
}
