import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import React from "react";

export type BugReportType = "manual" | "slow_load" | "api_error" | "crash";

export interface BugPromptState {
  open: boolean;
  type: BugReportType;
  prefillDescription: string;
  errorContext: Record<string, unknown> | null;
}

interface BugReportPromptContextValue {
  prompt: BugPromptState;
  promptBugReport: (type: BugReportType, context: Record<string, unknown>, description?: string) => void;
  dismissPrompt: () => void;
  /** Opens the bug report drawer with prefilled data */
  openReport: () => void;
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
}

const defaultState: BugPromptState = {
  open: false,
  type: "manual",
  prefillDescription: "",
  errorContext: null,
};

const BugReportPromptContext = createContext<BugReportPromptContextValue | null>(null);

export function BugReportPromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<BugPromptState>(defaultState);
  const [reportOpen, setReportOpen] = useState(false);

  const promptBugReport = useCallback(
    (type: BugReportType, context: Record<string, unknown>, description?: string) => {
      setPrompt({
        open: true,
        type,
        prefillDescription: description || "",
        errorContext: context,
      });
    },
    []
  );

  const dismissPrompt = useCallback(() => {
    setPrompt((p) => ({ ...p, open: false }));
  }, []);

  const openReport = useCallback(() => {
    setPrompt((p) => ({ ...p, open: false }));
    setReportOpen(true);
  }, []);

  return React.createElement(
    BugReportPromptContext.Provider,
    { value: { prompt, promptBugReport, dismissPrompt, openReport, reportOpen, setReportOpen } },
    children
  );
}

export function useBugReportPrompt() {
  const ctx = useContext(BugReportPromptContext);
  if (!ctx) throw new Error("useBugReportPrompt must be used within BugReportPromptProvider");
  return ctx;
}
