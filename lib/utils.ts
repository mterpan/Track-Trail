import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAppDate(dateStr: string | undefined | null, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return 'N/A';
  
  // Check if it's in YYYY-MM-DD format (exactly 10 chars)
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, options);
    }
  }
  
  // Fallback for other formats (ISO strings, etc)
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString(undefined, options);
}

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('quota exceeded') || 
         message.toLowerCase().includes('quota limit exceeded') ||
         message.toLowerCase().includes('quota exceeded for quota metric');
}
