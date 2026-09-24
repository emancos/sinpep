import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useSisregBridge = () => {
 const { socket, isConnected, extensionInstalled } = useSocket();

 useEffect(() => {
 if (!socket) return;

 // Função que recebe o pedido da API e envia para a Extensão
 const handleProxyRequest = (data: any) => {
 const { requestId, url, method, headers, body } = data;
 console.log(`[ProxyRequest] Recebido da API para buscar: ${url}`);

 if (!extensionInstalled) {
 console.error('Extensão não está instalada! Ignorando proxy_request.');
 socket.emit('proxy_response', {
 requestId,
 response: { error: 'Extensão não instalada no navegador do usuário.' }
 });
 return;
 }

 // Função para capturar a resposta da extensão
 const handleExtensionResponse = (event: MessageEvent) => {
 if (event.source !== window || event.data?.source !== 'EXTENSION') return;
 
 if (event.data.requestId === requestId) {
 console.log(`[ProxyRequest] Resposta recebida da extensão, devolvendo para API.`);
 // Remove listener para não acumular
 window.removeEventListener('message', handleExtensionResponse);
 
 socket.emit('proxy_response', {
 requestId,
 response: event.data.response
 });
 }
 };

 window.addEventListener('message', handleExtensionResponse);

 // Envia comando para a extensão
 window.postMessage({
 source: 'REACT_APP',
 action: 'PROXY_FETCH',
 requestId,
 payload: { url, method, headers, body }
 }, '*');
 };

 socket.on('proxy_request', handleProxyRequest);

 return () => {
 socket.off('proxy_request', handleProxyRequest);
 };
 }, [socket, extensionInstalled]);

 return { isConnected, extensionInstalled };
};
