"use client";

import { createContext, type ReactNode, useContext } from "react";

/** What the browser is told about the signed-in employee. For rendering only. */
export interface ClientSession {
  email: string;
  displayName: string;
  permissions: string[];
}

const SessionContext = createContext<ClientSession | null>(null);

export function ConsoleSessionProvider({ session, children }: { session: ClientSession; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useConsoleSession(): ClientSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useConsoleSession must be used inside the authenticated console");
  return session;
}
