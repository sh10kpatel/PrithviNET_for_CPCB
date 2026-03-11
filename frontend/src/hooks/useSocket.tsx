"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000");
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket();
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!socket) return;
    socket.on(event, stableHandler);
    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event, stableHandler]);
}
