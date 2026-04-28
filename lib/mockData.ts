import { Application, StatusEvent, Contact } from './db';

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'demo-1',
    userId: 'demo-user',
    company: 'Google',
    title: 'Senior Software Engineer',
    url: 'https://careers.google.com',
    dateApplied: '2026-04-15',
    status: 'Interviewing',
    notes: 'Exciting opportunity in the Cloud team.',
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now() - 5000000,
  },
  {
    id: 'demo-2',
    userId: 'demo-user',
    company: 'Netflix',
    title: 'Product Manager',
    url: 'https://jobs.netflix.com',
    dateApplied: '2026-04-10',
    status: 'Applied',
    notes: 'Love the culture here.',
    createdAt: Date.now() - 20000000,
    updatedAt: Date.now() - 20000000,
  },
  {
    id: 'demo-3',
    userId: 'demo-user',
    company: 'Stripe',
    title: 'Frontend Developer',
    url: 'https://stripe.com/jobs',
    dateApplied: '2026-04-05',
    status: 'Offer',
    notes: 'Received a verbal offer!',
    createdAt: Date.now() - 30000000,
    updatedAt: Date.now() - 1000000,
  }
];

export const MOCK_STATUS_EVENTS: StatusEvent[] = [
  {
    id: 'ev-1',
    userId: 'demo-user',
    applicationId: 'demo-1',
    status: 'Applied',
    date: '2026-04-15',
    notes: 'Application submitted via careers portal.',
    createdAt: Date.now() - 10000000,
  },
  {
    id: 'ev-2',
    userId: 'demo-user',
    applicationId: 'demo-1',
    status: 'Interviewing',
    date: '2026-04-22',
    notes: 'First round technical interview.',
    createdAt: Date.now() - 5000000,
  },
  {
    id: 'ev-3',
    userId: 'demo-user',
    applicationId: 'demo-3',
    status: 'Applied',
    date: '2026-04-05',
    createdAt: Date.now() - 30000000,
  },
  {
    id: 'ev-4',
    userId: 'demo-user',
    applicationId: 'demo-3',
    status: 'Interviewing',
    date: '2026-04-12',
    createdAt: Date.now() - 20000000,
  },
  {
    id: 'ev-5',
    userId: 'demo-user',
    applicationId: 'demo-3',
    status: 'Offer',
    date: '2026-04-27',
    notes: 'Final interview went great.',
    createdAt: Date.now() - 1000000,
  }
];

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    userId: 'demo-user',
    name: 'Jane Doe',
    company: 'Google',
    role: 'Recruiter',
    email: 'jane.doe@google.com',
    dateContacted: '2026-04-15',
    createdAt: Date.now() - 10000000,
  },
  {
    id: 'c-2',
    userId: 'demo-user',
    name: 'John Smith',
    company: 'Stripe',
    role: 'Engineering Manager',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    dateContacted: '2026-04-18',
    createdAt: Date.now() - 8000000,
  }
];
