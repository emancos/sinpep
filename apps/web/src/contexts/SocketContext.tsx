import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

interface SocketContextType {
 socket: Socket | null;
 isConnected: boolean;
 extensionInstalled: boolean;
}

const SocketContext = createContext<SocketContextType>({
 socket: null,
 isConnected: false,
 extensionInstalled: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [socket, setSocket] = useState<Socket | null>(null);
 const [isConnected, setIsConnected] = useState(false);
 const [extensionInstalled, setExtensionInstalled] = useState(false);
 const user = useAuthStore((state) => state.user);
 const token = useAuthStore((state) => state.token);

 useEffect(() => {
 const handleExtensionInit = (event: MessageEvent) => {
 if (event.source === window && event.data?.source === 'EXTENSION_INIT') {
 setExtensionInstalled(true);
 console.log('RegulaSB Extension detected!');
 }
 };
 
 window.addEventListener('message', handleExtensionInit);
 window.postMessage({ source: 'REACT_APP', action: 'PING' }, '*');

 return () => window.removeEventListener('message', handleExtensionInit);
 }, []);

 useEffect(() => {
 // Only connect if we have a logged-in user and valid token
 if (!user || !token) return;

 const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
 
 const newSocket = io(apiUrl, {
 auth: { userId: user.id, token },
 transports: ['websocket', 'polling'],
 });

 newSocket.on('connect', () => {
 setIsConnected(true);
 console.log('Socket connected:', newSocket.id);
 });

 newSocket.on('disconnect', () => {
 setIsConnected(false);
 console.log('Socket disconnected');
 });

 setSocket(newSocket);

 return () => {
 newSocket.disconnect();
 };
 }, [user, token]);

 return (
 <SocketContext.Provider value={{ socket, isConnected, extensionInstalled }}>
 {children}
 </SocketContext.Provider>
 );
};

export const useSocket = () => useContext(SocketContext);
