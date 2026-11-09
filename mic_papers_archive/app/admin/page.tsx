'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Manuscript } from '@/lib/googleSheets';

export default function AdminPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadManuscripts = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/manuscripts?includeRejected=1');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load manuscripts.');
      }

      setManuscripts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load manuscripts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManuscripts();
  }, []);

  const sortedManuscripts = useMemo(() => {
    return [...manuscripts].sort((a, b) => {
      if (a.status === 'REJECTED' && b.status !== 'REJECTED') {
        return 1;
      }

      if (a.status !== 'REJECTED' && b.status === 'REJECTED') {
        return -1;
      }

      return a.id.localeCompare(b.id);
    });
  }, [manuscripts]);

  const handleReject = async (manuscriptId: string) => {
    setProcessingId(manuscriptId);
    setError('');

    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manuscriptId }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to reject manuscript.');
      }

      setManuscripts((current) =>
        current.map((item) =>
          item.id === manuscriptId
            ? {
                ...item,
                status: 'REJECTED',
              }
            : item
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject manuscript.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnreject = async (manuscriptId: string) => {
    setProcessingId(manuscriptId);
    setError('');

    try {
      const res = await fetch('/api/admin/unreject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manuscriptId }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to unreject manuscript.');
      }

      setManuscripts((current) =>
        current.map((item) =>
          item.id === manuscriptId
            ? {
                ...item,
                status: 'VERIFIED',
              }
            : item
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unreject manuscript.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <section className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] p-6">
        <h1 className="font-pixel text-lg text-mahog">ADMIN PANEL</h1>
        <p className="text-xs text-iron/70 mt-2">
          Reject uploaded PDFs. Rejected entries are hidden from the public archive.
        </p>
      </section>

      {error && (
        <div className="p-4 bg-wax/20 border-2 border-wax text-wax font-mono text-xs font-bold">
          {error}
        </div>
      )}

      <section className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] h-[70dvh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-mahog">
              <tr className="border-b-4 border-black text-gold">
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">ID</th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">Paper</th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">Status</th>
                <th className="text-left font-pixel text-[8px] p-4 uppercase tracking-tighter">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-pixel text-xs text-mahog">
                    LOADING MANUSCRIPTS...
                  </td>
                </tr>
              ) : sortedManuscripts.length > 0 ? (
                sortedManuscripts.map((item) => (
                  <tr key={item.id} className="parchment-row">
                    <td className="p-4 text-[10px] font-bold text-iron uppercase">{item.id}</td>
                    <td className="p-4">
                      <p className="text-sm text-iron font-bold uppercase">{item.courseTitle}</p>
                      <p className="text-[10px] text-iron/70 uppercase">{item.filename}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 border rounded text-[9px] font-pixel ${
                          item.status === 'REJECTED'
                            ? 'bg-wax/20 text-wax border-wax/40'
                            : 'bg-emerald/20 text-emerald border-emerald/40'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() =>
                          item.status === 'REJECTED'
                            ? handleUnreject(item.id)
                            : handleReject(item.id)
                        }
                        disabled={processingId === item.id}
                        className="py-2 px-4 bg-gold text-mahog font-pixel text-[9px] border-2 border-black pixel-btn disabled:opacity-50"
                      >
                        {processingId === item.id
                          ? item.status === 'REJECTED'
                            ? 'RESTORING...'
                            : 'REJECTING...'
                          : item.status === 'REJECTED'
                            ? 'UNREJECT PDF'
                            : 'REJECT PDF'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-iron/50 font-bold uppercase">
                    No manuscripts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
