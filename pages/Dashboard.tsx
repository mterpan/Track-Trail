import React, { useEffect, useState, useMemo } from 'react';
import { getApplications, getContacts, Application, Contact } from '@/lib/db';
import { Briefcase, CheckCircle, XCircle, Clock, TrendingUp, Users, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { startOfWeek, endOfWeek, format, subWeeks, isWithinInterval, parseISO } from 'date-fns';

import { motion, AnimatePresence } from 'motion/react';
import { Loading } from '@/components/ui/loading';

export default function Dashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [apps, cts] = await Promise.all([
          getApplications(),
          getContacts()
        ]);
        
        apps.sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime());
        setApplications(apps);
        setContacts(cts);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = startOfWeek(now);
    const endOfThisWeek = endOfWeek(now);

    return {
      total: applications.length,
      active: applications.filter(a => a.status !== 'Rejected').length,
      applied: applications.filter(a => a.status === 'Applied').length,
      interviewing: applications.filter(a => a.status === 'Interviewing').length,
      offers: applications.filter(a => a.status === 'Offer' || a.status === 'Accepted').length,
      rejected: applications.filter(a => a.status === 'Rejected').length,
      contactsThisWeek: contacts.filter(c => {
        const contactDate = parseISO(c.dateContacted);
        return isWithinInterval(contactDate, { start: startOfThisWeek, end: endOfThisWeek });
      }).length,
    };
  }, [applications, contacts]);

  const chartData = useMemo(() => {
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const date = subWeeks(new Date(), i);
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      
      const appCount = applications.filter(app => {
        const appDate = parseISO(app.dateApplied);
        return isWithinInterval(appDate, { start, end });
      }).length;

      const contactCount = contacts.filter(c => {
        const contactDate = parseISO(c.dateContacted);
        return isWithinInterval(contactDate, { start, end });
      }).length;

      weeks.push({
        name: format(start, 'MMM d'),
        apps: appCount,
        contacts: contactCount
      });
    }
    return weeks;
  }, [applications, contacts]);

  const statusDistribution = useMemo(() => {
    const dist = [
      { name: 'Applied', value: stats.applied, color: '#3b82f6' },
      { name: 'Interviewing', value: stats.interviewing, color: '#a855f7' },
      { name: 'Offers', value: stats.offers, color: '#22c55e' },
      { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    ].filter(d => d.value > 0);
    return dist;
  }, [stats]);

  const recentApps = applications.slice(0, 5);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Loading key="loading" text="Loading your dashboard..." />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#2d2a26] font-serif">Dashboard</h1>
            <p className="text-[#6b665e] mt-2 text-lg">Welcome back! Here's an overview of your job search.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <button 
              onClick={() => navigate('/applications?status=Active')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-[#d97757] transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#f4efe6] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">Active Apps</h3>
                <TrendingUp className="w-5 h-5 text-[#d97757]" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.active}</div>
            </button>

            <button 
              onClick={() => navigate('/applications?status=Interviewing')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-purple-400 transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">Interviewing</h3>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.interviewing}</div>
            </button>

            <button 
              onClick={() => navigate('/applications?status=Offer')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-green-400 transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">Offers</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.offers}</div>
            </button>

            <button 
              onClick={() => navigate('/applications?status=Rejected')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-red-400 transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">Rejected</h3>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.rejected}</div>
            </button>

            <button 
              onClick={() => navigate('/applications')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-[#d97757] transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#f4efe6] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">Total Apps</h3>
                <Briefcase className="w-5 h-5 text-[#d97757]" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.total}</div>
            </button>

            <button 
              onClick={() => navigate('/contacts')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-[#e8e4dc] relative overflow-hidden text-left hover:border-[#d97757] transition-all group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#f4efe6] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex flex-row items-center justify-between pb-4 relative">
                <h3 className="text-sm font-semibold text-[#6b665e] uppercase tracking-wider">New Contacts</h3>
                <UserPlus className="w-5 h-5 text-[#d97757]" />
              </div>
              <div className="text-4xl font-bold text-[#2d2a26] relative">{stats.contactsThisWeek}</div>
              <div className="text-[10px] text-[#6b665e] font-bold uppercase tracking-wider mt-1">This Week</div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-[#e8e4dc] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif font-bold text-[#2d2a26]">Activity</h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6b665e] uppercase tracking-widest">
                    <div className="w-3 h-3 rounded-full bg-[#d97757]"></div>
                    Apps
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6b665e] uppercase tracking-widest">
                    <div className="w-3 h-3 rounded-full bg-[#6b665e]"></div>
                    Contacts
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b665e', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b665e', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#faf8f5' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid #e8e4dc',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        padding: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="apps" 
                      fill="#d97757" 
                      radius={[6, 6, 0, 0]} 
                      barSize={20}
                    />
                    <Bar 
                      dataKey="contacts" 
                      fill="#6b665e" 
                      radius={[6, 6, 0, 0]} 
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#e8e4dc] shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-[#2d2a26] mb-8">Distribution</h2>
              <div className="h-[300px] w-full relative">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid #e8e4dc',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#6b665e] text-sm italic">
                    No data to display
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-4">
                  {statusDistribution.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-xs font-medium text-[#6b665e]">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-[#2d2a26] mb-4">Recent Applications</h2>
            {recentApps.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#e8e4dc] shadow-sm p-12 text-center text-[#6b665e]">
                <div className="w-16 h-16 bg-[#f4efe6] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-[#d97757]" />
                </div>
                <p className="text-lg">No applications yet. Start tracking!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentApps.map(app => (
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
