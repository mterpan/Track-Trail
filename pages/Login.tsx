import React, { useState } from 'react';
import { signInWithGoogle } from '@/lib/firebase';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Login failed:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-[#e8e4dc] max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#f4efe6] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Briefcase className="w-8 h-8 text-[#d97757]" />
        </div>
        <h1 className="text-3xl font-bold text-[#2d2a26] font-serif mb-2">Track&Trail</h1>
        <p className="text-[#6b665e] mb-8">Your personal job application tracker. Keep everything organized in one place.</p>
        
        <Button 
          onClick={handleLogin}
          loading={loading}
          variant="outline"
          className="w-full h-12 gap-3 bg-white border border-[#e8e4dc] text-[#2d2a26] font-medium rounded-xl hover:bg-[#faf8f5] transition-all shadow-sm"
        >
          {!loading && (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

