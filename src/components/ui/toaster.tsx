"use client";
import * as Toast from "@radix-ui/react-toast";
import { useState, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";

type ToastType = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
  onUndo?: () => void;
};
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
      <Toast.Provider swipeDirection="right" duration={4000}>
        {toasts.map(t => (
          <Toast.Root
            key={t.id}
            className={cn(
              "fixed bottom-24 left-4 right-4 z-50 rounded-2xl p-4 shadow-lg border",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2",
              t.variant === "error"
                ? "bg-red-50 border-red-100 text-red-800"
                : t.variant === "success"
                ? "bg-green-50 border-green-100 text-green-800"
                : "bg-brand-100 border-brand-200 text-brand-800"
            )}
            onOpenChange={(open) => {
              if (!open) setToasts(prev => prev.filter(x => x.id !== t.id));
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Toast.Title className="font-semibold text-sm">{t.title}</Toast.Title>
                {t.description && (
                  <Toast.Description className="text-xs opacity-75 mt-0.5">{t.description}</Toast.Description>
                )}
              </div>
              {t.onUndo && (
                <Toast.Action altText="Undo" asChild>
                  <button
                    onClick={t.onUndo}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                  >
                    Undo
                  </button>
                </Toast.Action>
              )}
            </div>
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
