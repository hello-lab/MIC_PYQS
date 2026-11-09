'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const payload = await res.json();
    if (!payload.success) {
      setError(payload?.error || 'Invalid password.');
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-vellum border-4 border-black shadow-[8px_8px_0_#000] p-8">
      <h1 className="font-pixel text-lg text-mahog uppercase">Admin Login</h1>
      <p className="text-xs text-iron/70 mt-2">Restricted access only.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Enter admin password"
          />
        </div>

        {error && (
          <div className="p-3 bg-wax/20 border-2 border-wax text-wax font-mono text-xs font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gold text-mahog font-pixel text-[10px] border-2 border-black pixel-btn"
        >
          LOGIN
        </button>
      </form>
    </div>
  );
}
