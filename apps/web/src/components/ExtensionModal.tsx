import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { X, Download, Info } from 'lucide-react';

export const ExtensionModal: React.FC = () => {
 const { extensionInstalled } = useSocket();
 const [isOpen, setIsOpen] = useState(false);
 const [hideForever, setHideForever] = useState(false);

 useEffect(() => {
 // Atraso de 2 segundos para dar tempo do content script se comunicar
 const timer = setTimeout(() => {
 const hidden = localStorage.getItem('hideExtensionModal') === 'true';
 if (!extensionInstalled && !hidden) {
 setIsOpen(true);
 }
 }, 2000);

 return () => clearTimeout(timer);
 }, [extensionInstalled]);

 const handleClose = () => {
 if (hideForever) {
 localStorage.setItem('hideExtensionModal', 'true');
 }
 setIsOpen(false);
 };

 const handleDownload = (browser: 'chrome' | 'firefox') => {
 // Cria um link temporário para forçar o download do arquivo .zip
 const link = document.createElement('a');
 link.href = browser === 'chrome' ? '/extension.zip' : '/extension-firefox.zip';
 link.download = browser === 'chrome' ? 'regulasb-bridge-chrome.zip' : 'regulasb-bridge-firefox.zip';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
 <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
 <div className="absolute top-4 right-4">
 <button
 onClick={handleClose}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6">
 <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
 <Info className="w-6 h-6 text-blue-500" />
 </div>

 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
 Instalação da Extensão
 </h3>

 <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
 Alguns recursos do sistema, como o vínculo e busca de pacientes no SISREG III, requerem a instalação da extensão RegulaSB Bridge para funcionarem corretamente.
 </p>

 <div className="space-y-4">
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
 <strong className="block mb-1 text-slate-700 dark:text-slate-300">Google Chrome / Edge:</strong>
 1. Extrair o arquivo .zip baixado<br />
 2. Acesse <code className="bg-slate-200 dark:bg-slate-900 px-1 rounded text-blue-500 font-mono">chrome://extensions</code> no seu navegador<br />
 3. Ative o "Modo do Desenvolvedor" no canto superior direito<br />
 4. Clique em "Carregar desempacotado" e selecione a pasta<br /><br />
 
 <strong className="block mb-1 text-slate-700 dark:text-slate-300">Mozilla Firefox:</strong>
 1. Extrair o arquivo .zip baixado<br />
 2. Acesse <code className="bg-slate-200 dark:bg-slate-900 px-1 rounded text-orange-500 font-mono">about:debugging#/runtime/this-firefox</code><br />
 3. Clique em "Carregar extensão temporária"<br />
 4. Selecione o arquivo `manifest.json` dentro da pasta
 </div>

 <div className="flex flex-col gap-2">
 <button
 onClick={() => handleDownload('chrome')}
 className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all active:scale-95"
 >
 <Download className="w-5 h-5" />
 <span>Baixar para Chrome / Edge</span>
 </button>

 <button
 onClick={() => handleDownload('firefox')}
 className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl shadow-lg transition-all active:scale-95"
 >
 <Download className="w-5 h-5" />
 <span>Baixar para Firefox</span>
 </button>
 </div>

 <label className="flex items-center gap-2 mt-4 cursor-pointer text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
 <input
 type="checkbox"
 checked={hideForever}
 onChange={(e) => setHideForever(e.target.checked)}
 className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
 />
 Não exibir esta mensagem novamente
 </label>
 </div>
 </div>
 </div>
 </div>
 );
};
