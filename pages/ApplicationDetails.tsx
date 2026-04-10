import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplication, getStatusEvents, getAttachments, saveApplication, saveStatusEvent, saveAttachment, deleteAttachment, deleteApplication, Application, StatusEvent, Attachment, ApplicationStatus } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Trash2, Download, FileText, Plus, Briefcase, Link as LinkIcon, Calendar, Clock, Eye, Image as ImageIcon } from 'lucide-react';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '@/lib/firebase';
import { Loading } from '@/components/ui/loading';
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

export default function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Change Form
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Applied');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusNotes, setStatusNotes] = useState('');

  // Edit App Form
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete Dialogs
  const [appToDelete, setAppToDelete] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [previewType, setPreviewType] = useState<string>('');

  const loadData = async () => {
    if (!id) return;
    try {
      const application = await getApplication(id);
      if (!application) {
        navigate('/applications');
        return;
      }
      setApp(application);
      setEditCompany(application.company);
      setEditTitle(application.title);
      setEditUrl(application.url || '');
      setEditNotes(application.notes || '');
      setNewStatus(application.status);

      const evs = await getStatusEvents(id);
      evs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(evs);

      const atts = await getAttachments(id);
      setAttachments(atts);
    } catch (err) {
      console.error('Failed to load application details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;

    setSubmitting(true);
    try {
      // Update app status
      const updatedApp = { ...app, status: newStatus, updatedAt: Date.now() };
      await saveApplication(updatedApp);
      
      // Add event
      await saveStatusEvent({
        id: crypto.randomUUID(),
        userId: auth.currentUser?.uid || '',
        applicationId: app.id,
        status: newStatus,
        date: statusDate,
        notes: statusNotes,
        createdAt: Date.now()
      });

      setIsStatusOpen(false);
      setStatusNotes('');
      setStatusDate(new Date().toISOString().split('T')[0]);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;

    setSubmitting(true);
    try {
      const updatedApp = { 
        ...app, 
        company: editCompany, 
        title: editTitle, 
        url: editUrl, 
        notes: editNotes,
        updatedAt: Date.now() 
      };
      await saveApplication(updatedApp);
      setIsEditOpen(false);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !app) return;

    // Increased limit to 10MB since we now use chunking
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setUploading(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      
      // Convert Uint8Array to base64 string
      let binary = '';
      const len = buffer.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      const base64Data = window.btoa(binary);

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        userId: auth.currentUser?.uid || '',
        applicationId: app.id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data,
        createdAt: Date.now()
      };

      await saveAttachment(attachment);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (att: Attachment) => {
    // Convert base64 back to Uint8Array
    const binaryString = window.atob(att.data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: att.type });
    saveAs(blob, att.name);
  };

  const handlePreview = (att: Attachment) => {
    console.log('Previewing attachment:', att.name, att.type, att.data.length);
    if (!att.data || att.data.length === 0) {
      console.error('Attachment data is empty or missing');
      return;
    }

    // Convert base64 back to Uint8Array
    const binaryString = window.atob(att.data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: att.type });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewName(att.name);
    setPreviewType(att.type);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const confirmDeleteAttachment = async () => {
    if (attachmentToDelete) {
      await deleteAttachment(attachmentToDelete);
      setAttachmentToDelete(null);
      loadData();
    }
  };

  const confirmDeleteApp = async () => {
    if (appToDelete) {
      await deleteApplication(appToDelete);
      navigate('/applications');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {loading || !app ? (
        <Loading key="loading" text="Loading application details..." />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-6 md:space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/applications')} className="rounded-xl border-[#e8e4dc] hover:bg-[#faf8f5] text-[#6b665e] shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl border border-[#e8e4dc] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img 
                src={`https://logo.clearbit.com/${app.company.toLowerCase().replace(/\s+/g, '')}.com`}
                alt={app.company}
                className="w-full h-full object-contain p-2"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const icon = document.createElement('div');
                    icon.className = "text-[#d97757] fallback-icon";
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase w-6 h-6 md:w-8 md:h-8"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>';
                    parent.appendChild(icon);
                  }
                }}
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-[#2d2a26] font-serif truncate">{app.company}</h1>
              <p className="text-[#6b665e] text-base md:text-lg font-medium mt-1 truncate">{app.title}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-[#e8e4dc] hover:bg-[#faf8f5] text-[#2d2a26] h-10 md:h-11 px-4 md:px-6 text-sm md:text-base">Edit</Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-[500px] p-6 md:p-8">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-[#2d2a26]">Edit Application</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditApp} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[#6b665e]">Company</Label>
                  <Input id="company" value={editCompany} onChange={e => setEditCompany(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#6b665e]">Job Title</Label>
                  <Input id="title" value={editTitle} onChange={e => setEditTitle(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-[#6b665e]">Job URL</Label>
                  <Input id="url" type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-[#6b665e]">Notes</Label>
                  <Textarea id="notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757] resize-none" />
                </div>
                <div className="pt-6 flex justify-end">
                  <Button type="submit" loading={submitting} className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl w-full h-11">Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button variant="destructive" onClick={() => setAppToDelete(app.id)} className="rounded-xl h-10 md:h-11 px-4 md:px-6 bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none text-sm md:text-base">
            <Trash2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-[#2d2a26] mb-6">Application Info</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-[#faf8f5] p-4 md:p-5 rounded-2xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d97757] flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    Current Status
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-1
                      ${app.status === 'Applied' ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''}
                      ${app.status === 'Interviewing' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ''}
                      ${app.status === 'Offer' || app.status === 'Accepted' ? 'bg-green-50 text-green-700 border border-green-100' : ''}
                      ${app.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-100' : ''}
                      ${app.status === 'Draft' || app.status === 'Withdrawn' ? 'bg-neutral-100 text-neutral-700 border border-neutral-200' : ''}
                    `}>
                      {app.status}
                    </span>
                  </div>
                </div>
                <div className="bg-[#faf8f5] p-4 md:p-5 rounded-2xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d97757] flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    Date Applied
                  </div>
                  <div className="text-base md:text-lg font-medium text-[#2d2a26] mt-1">{new Date(app.dateApplied).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
              
              {app.url && (
                <div className="bg-[#faf8f5] p-4 md:p-5 rounded-2xl overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d97757] flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4" />
                    Job URL
                  </div>
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-[#2d2a26] font-medium hover:text-[#d97757] transition-colors break-all mt-1 inline-block text-sm md:text-base">
                    {app.url}
                  </a>
                </div>
              )}

              {app.notes && (
                <div className="bg-[#faf8f5] p-4 md:p-5 rounded-2xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d97757] mb-2">Notes</div>
                  <div className="whitespace-pre-wrap text-[#6b665e] leading-relaxed text-sm md:text-base">{app.notes}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm p-6 md:p-8">
            <div className="flex flex-row items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-[#2d2a26]">Attachments</h2>
              <div>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Button variant="outline" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()} className="rounded-xl border-[#e8e4dc] hover:bg-[#faf8f5] text-[#2d2a26] h-9 px-3 text-xs md:text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add File
                </Button>
              </div>
            </div>
            <div>
              {attachments.length === 0 ? (
                <div className="text-center text-[#6b665e] py-8 md:py-12 bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e4dc] text-sm md:text-base">
                  No attachments yet. Upload resumes, cover letters, or offer letters.
                </div>
              ) : (
                <ul className="space-y-3">
                  {attachments.map(att => {
                    const isImage = att.type.startsWith('image/');
                    const isPDF = att.type === 'application/pdf';
                    const canPreview = isImage || isPDF;

                    return (
                      <li key={att.id} className="p-3 md:p-4 flex items-center justify-between bg-[#faf8f5] rounded-2xl border border-[#e8e4dc] hover:border-[#d97757] transition-colors group">
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                          <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-[#e8e4dc]">
                            {isImage ? (
                              <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-[#d97757]" />
                            ) : (
                              <FileText className="w-4 h-4 md:w-5 md:h-5 text-[#d97757]" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="text-xs md:text-sm font-bold text-[#2d2a26] truncate">{att.name}</p>
                            <p className="text-[10px] md:text-xs font-medium text-[#6b665e] uppercase tracking-wider mt-0.5">{(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2 md:ml-4">
                          {canPreview && (
                            <Button variant="ghost" size="icon" onClick={() => handlePreview(att)} className="hover:bg-white rounded-xl h-8 w-8 md:h-9 md:w-9">
                              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#2d2a26]" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(att)} className="hover:bg-white rounded-xl h-8 w-8 md:h-9 md:w-9">
                            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#2d2a26]" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setAttachmentToDelete(att.id)} className="hover:bg-red-50 hover:text-red-600 rounded-xl h-8 w-8 md:h-9 md:w-9">
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Timeline */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm p-6 md:p-8">
            <div className="flex flex-row items-center justify-between mb-8">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-[#2d2a26]">Status History</h2>
              <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-xl border-[#e8e4dc] hover:bg-[#faf8f5] text-[#2d2a26] h-9 px-3 text-xs md:text-sm">Update Status</Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl sm:max-w-[400px] p-6 md:p-8">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl text-[#2d2a26]">Update Status</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStatusChange} className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="newStatus" className="text-[#6b665e]">New Status</Label>
                      <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ApplicationStatus)}>
                        <SelectTrigger className="rounded-xl border-[#e8e4dc] focus:ring-[#d97757]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Applied">Applied</SelectItem>
                          <SelectItem value="Interviewing">Interviewing</SelectItem>
                          <SelectItem value="Offer">Offer</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statusDate" className="text-[#6b665e]">Date of Change</Label>
                      <Input id="statusDate" type="date" value={statusDate} onChange={e => setStatusDate(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statusNotes" className="text-[#6b665e]">Notes (Optional)</Label>
                      <Textarea id="statusNotes" value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={3} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757] resize-none" />
                    </div>
                    <div className="pt-6 flex justify-end">
                      <Button type="submit" loading={submitting} className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl w-full h-11">Save Status</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <div className="relative border-l-2 border-[#f4efe6] ml-4 space-y-6 md:space-y-8">
                {events.map((ev, idx) => (
                  <div key={ev.id} className="relative pl-6 md:pl-8">
                    <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-[#d97757] rounded-full -left-[7px] md:-left-[9px] top-1 border-4 border-white shadow-sm"></div>
                    <div className="text-base md:text-lg font-bold text-[#2d2a26] leading-none">{ev.status}</div>
                    <div className="text-xs md:text-sm font-medium text-[#6b665e] mt-1.5 uppercase tracking-wider">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    {ev.notes && (
                      <div className="text-xs md:text-sm text-[#6b665e] mt-3 bg-[#faf8f5] p-3 md:p-4 rounded-2xl border border-[#e8e4dc] leading-relaxed">
                        {ev.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete App Dialog */}
      <AlertDialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-[#2d2a26]">Delete Application</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b665e] text-base mt-2">
              Are you sure you want to delete this application? This will also delete all associated status events and attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl h-11 px-6 border-[#e8e4dc] hover:bg-[#faf8f5]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteApp} className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-6">
              Delete Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Attachment Dialog */}
      <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-[#2d2a26]">Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b665e] text-base mt-2">
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl h-11 px-6 border-[#e8e4dc] hover:bg-[#faf8f5]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAttachment} className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-6">
              Delete Attachment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="rounded-3xl max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none bg-white shadow-2xl">
          <DialogHeader className="p-6 bg-white border-b border-[#e8e4dc] flex flex-row items-center justify-between">
            <DialogTitle className="font-serif text-xl text-[#2d2a26] truncate pr-4">
              {previewName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 flex items-center justify-center bg-[#faf8f5] min-h-[400px] overflow-auto">
            {previewType.startsWith('image/') ? (
              <img 
                src={previewUrl!} 
                alt={previewName} 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Image failed to load');
                  const target = e.target as HTMLImageElement;
                  if (target.src !== 'https://placehold.co/400x300?text=Preview+Error') {
                    target.src = 'https://placehold.co/400x300?text=Preview+Error';
                  }
                }}
              />
            ) : previewType === 'application/pdf' ? (
              <iframe 
                src={`${previewUrl}#toolbar=0`} 
                className="w-full h-[65vh] rounded-lg shadow-lg border-none" 
                title={previewName} 
              />
            ) : (
              <div className="text-[#6b665e] flex flex-col items-center gap-4">
                <FileText className="w-16 h-16 text-[#d97757]" />
                <p>Preview not available for this file type.</p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-white border-t border-[#e8e4dc] flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setPreviewUrl(null)} 
              className="rounded-xl border-[#e8e4dc] h-11 px-6"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                const att = attachments.find(a => a.name === previewName);
                if (att) {
                  const binaryString = window.atob(att.data);
                  const len = binaryString.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: previewType });
                  saveAs(blob, previewName);
                }
              }} 
              className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl h-11 px-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
