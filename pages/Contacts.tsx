import React, { useEffect, useState } from 'react';
import { getContacts, saveContact, deleteContact, Contact } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Mail, Phone, Building2, Users, ExternalLink, Pencil } from 'lucide-react';
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

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [dateContacted, setDateContacted] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      data.sort((a, b) => new Date(b.dateContacted).getTime() - new Date(a.dateContacted).getTime());
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const contactData: Contact = {
        id: editingContact ? editingContact.id : crypto.randomUUID(),
        userId: auth.currentUser?.uid || '',
        name,
        company,
        role,
        email,
        phone,
        linkedinUrl,
        dateContacted,
        notes,
        createdAt: editingContact ? editingContact.createdAt : Date.now()
      };
      
      await saveContact(contactData);
      
      setIsAddOpen(false);
      setEditingContact(null);
      resetForm();
      await loadContacts();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCompany('');
    setRole('');
    setEmail('');
    setPhone('');
    setLinkedinUrl('');
    setDateContacted(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setCompany(contact.company);
    setRole(contact.role || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setLinkedinUrl(contact.linkedinUrl || '');
    setDateContacted(contact.dateContacted);
    setNotes(contact.notes || '');
    setIsAddOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsAddOpen(open);
    if (!open) {
      setEditingContact(null);
      resetForm();
    }
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      await deleteContact(contactToDelete);
      setContactToDelete(null);
      loadContacts();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Loading key="loading" text="Loading contacts..." />
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2d2a26] font-serif">Inbound Contacts</h1>
          <p className="text-[#6b665e] mt-2 text-base md:text-lg">People who reached out to you</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl shadow-sm h-11 px-6 w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl sm:max-w-[500px] p-6 md:p-8">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-[#2d2a26]">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#6b665e]">Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[#6b665e]">Company</Label>
                  <Input id="company" value={company} onChange={e => setCompany(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#6b665e]">Role / Title</Label>
                <Input id="role" value={role} onChange={e => setRole(e.target.value)} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#6b665e]">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#6b665e]">Phone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="text-[#6b665e]">LinkedIn Profile URL</Label>
                <Input id="linkedinUrl" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateContacted" className="text-[#6b665e]">Date Contacted</Label>
                <Input id="dateContacted" type="date" value={dateContacted} onChange={e => setDateContacted(e.target.value)} required className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#6b665e]">Notes</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="rounded-xl border-[#e8e4dc] focus-visible:ring-[#d97757] resize-none" />
              </div>
              <div className="pt-6 flex justify-end">
                <Button type="submit" loading={submitting} className="bg-[#d97757] hover:bg-[#c26548] text-white rounded-xl w-full h-11">
                  {editingContact ? 'Update Contact' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.length === 0 ? (
          <div className="col-span-full p-16 text-center text-[#6b665e] bg-white rounded-3xl border border-[#e8e4dc] shadow-sm">
            <div className="w-20 h-20 bg-[#f4efe6] rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[#d97757]" />
            </div>
            <p className="text-xl font-medium mb-2">No contacts yet.</p>
            <p>Click "Add Contact" to start tracking inbound opportunities.</p>
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="bg-white rounded-3xl border border-[#e8e4dc] p-6 shadow-sm relative group hover:shadow-md transition-all">
              <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-blue-50 hover:text-blue-600 rounded-xl w-8 h-8"
                  onClick={() => handleEdit(contact)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-red-50 hover:text-red-600 rounded-xl w-8 h-8"
                  onClick={() => setContactToDelete(contact.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-5">
                <h3 className="font-bold text-xl text-[#2d2a26] font-serif pr-8">{contact.name}</h3>
                <div className="flex items-center text-[#6b665e] text-sm mt-2 font-medium">
                  <Building2 className="w-4 h-4 mr-2 text-[#d97757]" />
                  {contact.role ? `${contact.role} at ` : ''}{contact.company}
                </div>
              </div>
              
              <div className="space-y-3 text-sm bg-[#faf8f5] p-4 rounded-2xl">
                {contact.email && (
                  <div className="flex items-center text-[#6b665e]">
                    <Mail className="w-4 h-4 mr-3 text-[#d97757]" />
                    <a href={`mailto:${contact.email}`} className="hover:text-[#d97757] transition-colors font-medium">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center text-[#6b665e]">
                    <Phone className="w-4 h-4 mr-3 text-[#d97757]" />
                    <a href={`tel:${contact.phone}`} className="hover:text-[#d97757] transition-colors font-medium">{contact.phone}</a>
                  </div>
                )}
                {contact.linkedinUrl && (
                  <div className="flex items-center text-[#6b665e]">
                    <ExternalLink className="w-4 h-4 mr-3 text-[#d97757]" />
                    <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#d97757] transition-colors font-medium">LinkedIn Profile</a>
                  </div>
                )}
                {!contact.email && !contact.phone && !contact.linkedinUrl && (
                  <div className="text-[#6b665e] italic">No contact info provided</div>
                )}
              </div>
              
              <div className="mt-5 pt-5 border-t border-[#e8e4dc]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#d97757] mb-2">
                  Contacted on {new Date(contact.dateContacted).toLocaleDateString()}
                </div>
                {contact.notes && (
                  <p className="text-sm text-[#6b665e] leading-relaxed line-clamp-3">{contact.notes}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete Contact</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b665e]">
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
