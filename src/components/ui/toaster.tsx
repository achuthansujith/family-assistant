"use client";
import * as Toast from "@radix-ui/react-toast";
import { useState, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";

type ToastType = { id: string; title: string; description?: string; variant?: "default" | "success" | "error" };
type ToastContextType = { toast: (t: Omit<ToastType, "id">) => void };

const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function Toaster() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const toast = useCallback((t: Omit<ToastType, "id">) => {
    setToasts(prev => [...prev, { ...t, id: Math.random().toString(36) }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {toasts.map(t => (
          <Toast.Root
            key={t.id}
            className={cn(
              "fixed bottom-20 left-4 right-4 z-50 rounded-xl p-4 shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              t.variant === "error" ? "bg-red-500 text-white" :
              t.variant === "success" ? "bg-green-500 text-white" :
              "bg-gray-900 text-white"
            )}
            onOpenChange={(open) => {
              if (!open) setToasts(prev => prev.filter(x => x.id !== t.id));
            }}
          >
            <Toast.Title className="font-medium text-sm">{t.title}</Toast.Title>
            {t.description && <Toast.Description className="text-xs opacity-80 mt-0.5">{t.description}</Toast.Description>}
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
