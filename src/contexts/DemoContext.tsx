import { createContext, useContext, ReactNode } from "react";

// The demo user ID - this is the user whose data we'll display in demo mode
// This bypasses auth and uses RLS policies that allow public read access to this user's data
export const DEMO_USER_ID = "da422baa-3f54-4fac-88bb-5137bc085ddc";

interface DemoContextValue {
  isDemoMode: boolean;
  demoUserId: string;
}

const DemoContext = createContext<DemoContextValue | null>(null);

interface DemoProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const DemoProvider = ({ children, enabled = false }: DemoProviderProps) => {
  return (
    <DemoContext.Provider value={{ isDemoMode: enabled, demoUserId: DEMO_USER_ID }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = (): DemoContextValue => {
  const context = useContext(DemoContext);
  // Default to non-demo mode if not wrapped in provider
  if (!context) {
    return { isDemoMode: false, demoUserId: DEMO_USER_ID };
  }
  return context;
};
