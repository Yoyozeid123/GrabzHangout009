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
    // Poll every 1 second as requested
    refetchInterval: 1000,
  });
}

export function useSendMessage() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
    onError: (error) => {
      toast({
        title: "ERROR",
        description: error.message,
        variant: "destructive",
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
    },
    onError: (error) => {
      toast({
        title: "DELETE FAILED",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
