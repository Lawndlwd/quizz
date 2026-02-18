import { useEffect, useLayoutEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let sharedSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return sharedSocket;
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = getSocket();
  const handlerRef = useRef(handler);
  useLayoutEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const fn = (data: T) => handlerRef.current(data);
    socket.on(event, fn);
    return () => { socket.off(event, fn); };
  }, [event, socket]);
}
