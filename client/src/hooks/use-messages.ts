import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertMessage } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Helper to safely parse API responses and log Zod errors
function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // Fallback to returning raw data if it's a z.custom type issue (like Dates from JSON)
    return data as T;
  }
  return result.data;
}

export function useMessages(room: string = "main") {
  return useQuery({
    queryKey: [api.messages.list.path, room],
    queryFn: async () => {
      const res = await fetch(`${api.messages.list.path}?room=${encodeURIComponent(room)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return parseWithLogging<any[]>(api.messages.list.responses[200], data, "messages.list");
    },
    staleTime: Infinity, // WebSocket handles updates, no polling needed
  });
}

export function useSendMessage(room: string = "main") {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (message: InsertMessage) => {
      const validated = api.messages.create.input.parse(message);
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Validation failed");
        }
        throw new Error("Failed to send message");
      }
      
      const data = await res.json();
      return parseWithLogging<any>(api.messages.create.responses[201], data, "messages.create");
    },
    onMutate: async (message) => {
      // Optimistic update — add message instantly
      const key = [api.messages.list.path, room];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: any[]) => [
        ...(old || []),
        { ...message, id: Date.now(), createdAt: new Date().toISOString() }
      ]);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, room] });
    },
    onError: (error, _vars, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData([api.messages.list.path, room], ctx.prev);
      toast({ title: "ERROR", description: error.message, variant: "destructive" });
    }
  });
}

export function useUploadImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.uploads.create.path, {
        method: api.uploads.create.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Upload failed");
        }
        throw new Error("Failed to upload image");
      }

      const data = await res.json();
      return parseWithLogging<{ filename: string }>(
        api.uploads.create.responses[201], 
        data, 
        "uploads.create"
      );
    },
    onError: (error) => {
      toast({
        title: "UPLOAD FAILED",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const path = api.messages.delete.path.replace(':id', String(id));
      const res = await fetch(path, {
        method: api.messages.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete message");
      return res.json();
    },
    onMutate: async (id) => {
      // Optimistic delete — remove instantly from UI
      const keys = queryClient.getQueriesData({ queryKey: [api.messages.list.path] });
      for (const [key, data] of keys) {
        queryClient.setQueryData(key, (old: any[]) => (old || []).filter((m: any) => m.id !== id));
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
      toast({ title: "DELETE FAILED", description: error.message, variant: "destructive" });
    }
  });
}
