import React, { useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Download, Upload, LogOut, Menu, X } from 'lucide-react';
import { exportData, importData } from '@/lib/exportImport';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { logout } from '@/lib/firebase';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleExport = async () => {
    try {
      await exportData();
      toast.success('Data exported successfully');
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Failed to export data.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setIsImportAlertOpen(true);
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setIsImportAlertOpen(false);
    setIsImporting(true);
    setImportLogs(['Starting import...']);
    
    try {
      const result = await importData(importFile);
      setImportLogs(result.logs);
      
      if (result.success && result.stats.errors === 0) {
        toast.success(`Imported ${result.stats.apps} applications successfully!`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        if (result.stats.apps > 0 || result.stats.contacts > 0) {
          toast.warning(`Imported with ${result.stats.errors} errors. See logs.`);
        } else {
          toast.error('Import failed or no data was found. See logs.');
        }
        setIsLogsOpen(true);
      }
    } catch (err) {
      console.error('Import failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      setImportLogs(prev => [...prev, `FATAL ERROR: ${msg}`]);
      toast.error('A fatal error occurred during import.');
      setIsLogsOpen(true);
    } finally {
      setIsImporting(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelImport = () => {
    setIsImportAlertOpen(false);
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Applications', path: '/applications', icon: Briefcase },
    { name: 'Contacts', path: '/contacts', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col lg:flex-row font-sans pb-32 lg:pb-0">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-[#e8e4dc] p-4 flex items-center justify-center sticky top-0 z-40">
        <h1 className="text-xl font-bold tracking-tight text-[#2d2a26] flex items-center gap-2 font-serif">
          <Briefcase className="w-5 h-5 text-[#d97757]" />
          Track&Trail
        </h1>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#e8e4dc] flex-col shadow-sm sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#2d2a26] flex items-center gap-2 font-serif">
            <Briefcase className="w-6 h-6 text-[#d97757]" />
            Track&Trail
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-[#f4efe6] text-[#d97757] shadow-sm' 
                    : 'text-[#6b665e] hover:bg-[#faf8f5] hover:text-[#2d2a26]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e8e4dc] space-y-2">
          <button 
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#6b665e] hover:bg-[#faf8f5] hover:text-[#2d2a26] transition-all"
          >
            <Download className="w-5 h-5" />
            Export ZIP
          </button>
          
          <input 
            type="file" 
            accept=".zip" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#6b665e] hover:bg-[#faf8f5] hover:text-[#2d2a26] transition-all"
          >
            <Upload className="w-5 h-5" />
            Import ZIP
          </button>

          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all mt-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 bg-white/95 backdrop-blur-md border border-[#e8e4dc] px-6 py-3 flex items-center justify-between z-40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive ? 'text-[#d97757]' : 'text-[#6b665e]'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-[#d97757]/10' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
        <button 
          onClick={() => setIsMoreMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-[#6b665e]"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* Mobile More Menu Dialog */}
      <Dialog open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <DialogContent className="rounded-t-3xl rounded-b-none sm:rounded-3xl fixed bottom-0 sm:bottom-auto sm:top-1/2 translate-y-0 sm:-translate-y-1/2 p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Actions</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 pt-4">
            <button 
              onClick={() => {
                handleExport();
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#faf8f5] text-[#2d2a26] font-medium border border-[#e8e4dc]"
            >
              <Download className="w-5 h-5 text-[#d97757]" />
              Export Data (ZIP)
            </button>
            <button 
              onClick={() => {
                fileInputRef.current?.click();
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#faf8f5] text-[#2d2a26] font-medium border border-[#e8e4dc]"
            >
              <Upload className="w-5 h-5 text-[#d97757]" />
              Import Data (ZIP)
            </button>
            <button 
              onClick={() => {
                logout();
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-50 text-red-600 font-medium border border-red-100 mt-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Confirm Import</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b665e]">
              Importing will overwrite all current data. This action cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelImport} variant="outline" size="default" className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl">
              Yes, Import Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Import Logs
            </DialogTitle>
            <DialogDescription>
              Detailed logs of the last import attempt.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[300px] w-full rounded-xl border border-[#e8e4dc] bg-[#faf8f5] p-4">
            <div className="space-y-1 font-mono text-xs">
              {importLogs.map((log, i) => (
                <div key={i} className={log.includes('ERROR') ? 'text-red-600 font-bold' : 'text-[#6b665e]'}>
                  {log}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <button 
              onClick={() => setIsLogsOpen(false)}
              className="px-6 py-2 bg-[#d97757] text-white rounded-xl font-medium hover:bg-[#c26548] transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isImporting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#e8e4dc] flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#d97757] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-serif text-lg font-bold text-[#2d2a26]">Importing Data...</p>
            <p className="text-sm text-[#6b665e]">Please wait while we process your file.</p>
          </div>
        </div>
      )}
    </div>
  );
}
