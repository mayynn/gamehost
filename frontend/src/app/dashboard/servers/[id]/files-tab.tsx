"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { File, Folder, ArrowLeft, FolderPlus, Trash2, Edit2, Download, Archive, RefreshCw, ChevronRight, Save, X, FileText, Upload } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serversApi } from "@/lib/api/servers";
import type { FileItem } from "@/types";
import toast from "react-hot-toast";

export function FilesTab({ serverId }: { serverId: string }) {
  const [cwd, setCwd] = useState("/");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["server-files", serverId, cwd],
    queryFn: () => serversApi.listFiles(serverId, cwd).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileNames: string[]) => serversApi.deleteFiles(serverId, { root: cwd, files: fileNames }),
    onSuccess: () => { toast.success("Deleted"); refetch(); setSelected(new Set()); },
    onError: () => toast.error("Delete failed"),
  });

  const createDirMutation = useMutation({
    mutationFn: (name: string) => serversApi.createDirectory(serverId, { root: cwd, name }),
    onSuccess: () => { toast.success("Folder created"); refetch(); setCreating(null); setNewName(""); },
    onError: () => toast.error("Failed to create folder"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => serversApi.renameFile(serverId, { root: cwd, from, to }),
    onSuccess: () => { toast.success("Renamed"); refetch(); setRenaming(null); },
    onError: () => toast.error("Rename failed"),
  });

  const compressMutation = useMutation({
    mutationFn: (fileNames: string[]) => serversApi.compressFiles(serverId, { root: cwd, files: fileNames }),
    onSuccess: () => { toast.success("Compressed"); refetch(); setSelected(new Set()); },
  });

  const writeMutation = useMutation({
    mutationFn: (data: { file: string; content: string }) => serversApi.writeFile(serverId, data),
    onSuccess: () => { toast.success("Saved"); setEditing(null); refetch(); },
    onError: () => toast.error("Save failed"),
  });

  const navigate = (dir: string) => {
    const target = dir.startsWith("/") ? dir : `${cwd === "/" ? "" : cwd}/${dir}`;
    setCwd(target);
    setSelected(new Set());
    setEditing(null);
  };

  const goUp = () => {
    const parts = cwd.split("/").filter(Boolean);
    parts.pop();
    setCwd("/" + parts.join("/"));
    setSelected(new Set());
    setEditing(null);
  };

  const openFile = async (file: FileItem) => {
    if (file.is_file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("File too large to edit in browser");
      try {
        const filePath = `${cwd === "/" ? "" : cwd}/${file.name}`;
        const { data } = await serversApi.getFileContents(serverId, filePath);
        setEditing({ path: filePath, content: typeof data === "string" ? data : JSON.stringify(data, null, 2) });
      } catch {
        toast.error("Failed to read file");
      }
    } else {
      navigate(file.name);
    }
  };

  const downloadFile = async (name: string) => {
    try {
      const path = `${cwd === "/" ? "" : cwd}/${name}`;
      const { data } = await serversApi.getDownloadUrl(serverId, path);
      window.open(data.download_url, "_blank");
    } catch {
      toast.error("Download failed");
    }
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const { data } = await serversApi.getUploadUrl(serverId);
      const uploadUrl = data.upload_url;
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const form = new FormData();
        form.append("files", file, file.name);
        await fetch(`${uploadUrl}&directory=${encodeURIComponent(cwd)}`, {
          method: "POST",
          body: form,
        });
      }
      toast.success(`Uploaded ${fileList.length} file(s)`);
      refetch();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setDragOver(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const breadcrumbs = cwd.split("/").filter(Boolean);

  if (editing) {
    return (
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-neon-orange" />
            <span className="font-mono text-xs">{editing.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => writeMutation.mutate({ file: editing.path, content: editing.content })} disabled={writeMutation.isPending}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        <textarea
          value={editing.content}
          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          className="w-full h-[500px] bg-black/40 p-4 font-mono text-xs text-white/90 resize-none focus:outline-none custom-scrollbar"
          spellCheck={false}
        />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <button onClick={() => { setCwd("/"); setSelected(new Set()); }} className="text-neon-orange hover:underline">/</button>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button onClick={() => navigate("/" + breadcrumbs.slice(0, i + 1).join("/"))} className="hover:text-neon-orange transition-colors">{part}</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => compressMutation.mutate(Array.from(selected))}><Archive className="w-3.5 h-3.5 mr-1" /> Compress</Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete ${selected.size} item(s)?`)) deleteMutation.mutate(Array.from(selected)); }}
                className="text-neon-red hover:text-neon-red"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setCreating("folder"); setNewName(""); }}><FolderPlus className="w-3.5 h-3.5 mr-1" /> New Folder</Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* New folder input */}
      {creating === "folder" && (
        <div className="flex items-center gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Folder name" className="max-w-xs"
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && createDirMutation.mutate(newName.trim())} autoFocus />
          <Button size="sm" onClick={() => newName.trim() && createDirMutation.mutate(newName.trim())}>Create</Button>
          <Button variant="ghost" size="sm" onClick={() => setCreating(null)}>Cancel</Button>
        </div>
      )}

      {/* File list */}
      <GlassCard className={`p-0 overflow-hidden transition-colors ${dragOver ? "ring-2 ring-neon-orange/50 bg-neon-orange/5" : ""}`}
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="divide-y divide-white/5">
          {cwd !== "/" && (
            <button onClick={goUp} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-sm">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">..</span>
            </button>
          )}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading files...</div>
          ) : files && files.length > 0 ? (
            [...files].sort((a, b) => {
              if (a.is_file === b.is_file) return a.name.localeCompare(b.name);
              return a.is_file ? 1 : -1;
            }).map((file) => (
              <div key={file.name} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group ${selected.has(file.name) ? "bg-neon-orange/5" : ""}`}>
                <input type="checkbox" checked={selected.has(file.name)} onChange={() => toggleSelect(file.name)}
                  className="rounded border-white/20 bg-transparent accent-neon-orange w-3.5 h-3.5" />
                <button onClick={() => openFile(file)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  {file.is_file ? <File className="w-4 h-4 text-muted-foreground shrink-0" /> : <Folder className="w-4 h-4 text-neon-orange shrink-0" />}
                  {renaming === file.name ? (
                    <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} className="h-7 text-sm max-w-xs"
                      onKeyDown={(e) => { if (e.key === "Enter" && renameTo.trim()) renameMutation.mutate({ from: file.name, to: renameTo.trim() }); if (e.key === "Escape") setRenaming(null); }} autoFocus onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <span className="text-sm truncate">{file.name}</span>
                  )}
                </button>
                <span className="text-xs text-muted-foreground hidden sm:block w-20 text-right">
                  {file.is_file ? formatSize(file.size) : `${file.size} items`}
                </span>
                <span className="text-xs text-muted-foreground hidden md:block w-32">
                  {new Date(file.modified_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setRenaming(file.name); setRenameTo(file.name); }}
                    className="p-1 rounded hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                  {file.is_file && (
                    <button onClick={(e) => { e.stopPropagation(); downloadFile(file.name); }}
                      className="p-1 rounded hover:bg-white/10"><Download className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${file.name}"?`)) deleteMutation.mutate([file.name]); }}
                    className="p-1 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">This directory is empty.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
