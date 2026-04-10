import React, { useEffect, useState, useMemo } from 'react';
import { getApplications, saveApplication, saveStatusEvent, Application, ApplicationStatus } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Briefcase, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '@/lib/firebase';
import { Loading } from '@/components/ui/loading';

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') as ApplicationStatus | 'All' | 'Active') || 'All';

  const [applications, setApplications] = useState<Application[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ApplicationStatus>('Applied');

  const loadApps = async () => {
    try {
      const apps = await getApplications();
      apps.sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime());
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'All') return applications;
    if (statusFilter === 'Active') return applications.filter(app => app.status !== 'Rejected');
    return applications.filter(app => app.status === statusFilter);
  }, [applications, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newApp: Application = {
        id: crypto.randomUUID(),
        userId: auth.currentUser?.uid || '',
        company,
        title,
        url,
        dateApplied,
        status,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await saveApplication(newApp);
      
      // Create initial status event
      await saveStatusEvent({
        id: crypto.randomUUID(),
        userId: auth.currentUser?.uid || '',
        applicationId: newApp.id,
        status: newApp.status,
        date: dateApplied,
        notes: 'Application created',
        createdAt: Date.now()
      });

      setIsAddOpen(false);
      setCompany('');
      setTitle('');
      setUrl('');
      setDateApplied(new Date().toISOString().split('T')[0]);
      setStatus('Applied');
      await loadApps();
    } finally {
      setSubmitting(false);
    }
  };

  const setFilter = (status: string) => {
    if (status === 'All') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Loading key="loading" text="Loading applications..." />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2d2a26] font-serif">Applications</h1>
          <p className="text-[#6b665e] mt-2 text-base md:text-lg">Manage and track your job applications.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl shadow-sm h-11 px-6 flex-1 sm:flex-none">
                <Plus className="w-5 h-5" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-[500px] p-6 md:p-8">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-[#2d2a26]">Add New Application</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[#6b665e]">Company</Label>
                  <Input id="company" value={company} onChange={e => setCompany(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#6b665e]">Job Title</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-[#6b665e]">Job URL (optional)</Label>
                  <Input id="url" type="url" value={url} onChange={e => setUrl(e.target.value)} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateApplied" className="text-[#6b665e]">Date Applied</Label>
                    <Input id="dateApplied" type="date" value={dateApplied} onChange={e => setDateApplied(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-[#6b665e]">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
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
                </div>
                <div className="pt-6 flex justify-end">
                  <Button type="submit" loading={submitting} className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl w-full h-11">Save Application</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="w-40 sm:w-48">
            <Select value={statusFilter} onValueChange={setFilter}>
              <SelectTrigger className="rounded-xl border-[#e8e4dc] bg-white h-11 focus:ring-[#d97757] text-[#2d2a26] font-medium">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6b665e]" />
                  <SelectValue placeholder="Filter by Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
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
        </div>
      </div>

      <div className="">
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm p-12 md:p-16 text-center text-[#6b665e]">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#f4efe6] rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-[#d97757]" />
            </div>
            <p className="text-xl font-medium mb-2">
              {statusFilter === 'All' ? 'No applications yet.' : 
               statusFilter === 'Active' ? 'No active applications.' :
               `No applications with status "${statusFilter}".`}
            </p>
            <p>
              {statusFilter === 'All' 
                ? 'Click "Add Application" to start tracking your job search.' 
                : 'Try changing the filter or add a new application.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map(app => (
              <Link 
                key={app.id} 
                to={`/applications/${app.id}`}
                className="group bg-white rounded-3xl border border-[#e8e4dc] p-6 shadow-sm hover:shadow-md hover:border-[#d97757]/30 transition-all flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#f4efe6] rounded-2xl group-hover:bg-[#d97757]/10 transition-colors">
                    <Briefcase className="w-6 h-6 text-[#d97757]" />
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${app.status === 'Applied' ? 'bg-blue-50 text-blue-700 border border-blue-100' : ''}
                    ${app.status === 'Interviewing' ? 'bg-purple-50 text-purple-700 border border-purple-100' : ''}
                    ${app.status === 'Offer' || app.status === 'Accepted' ? 'bg-green-50 text-green-700 border border-green-100' : ''}
                    ${app.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-100' : ''}
                    ${app.status === 'Draft' || app.status === 'Withdrawn' ? 'bg-neutral-100 text-neutral-700 border border-neutral-200' : ''}
                  `}>
                    {app.status}
                  </span>
                </div>
                
                <div className="space-y-1 mb-6">
                  <h3 className="font-bold text-xl text-[#2d2a26] font-serif group-hover:text-[#d97757] transition-colors line-clamp-1">
                    {app.title}
                  </h3>
                  <p className="text-[#6b665e] font-medium flex items-center gap-2">
                    {app.company}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-[#e8e4dc] flex items-center justify-between text-xs text-[#6b665e]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Applied on</span>
                    <span className="font-bold text-[#2d2a26]">
                      {new Date(app.dateApplied).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
