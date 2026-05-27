'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/common/Navbar';
import { Activity, Bell, Monitor, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function QueueMonitor() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchQueueData = async () => {
    try {
      const token = localStorage.getItem('token');

const res = await fetch(`${API_BASE_URL}/queue`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
      if (!res.ok) throw new Error('Failed to retrieve active token queue.');
      const data = await res.json();
      setTokens(data.tokens || []);
      setError('');
    } catch (err) {
      console.error('Queue poll fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();

    // FIX: Memory leak fixed — clearInterval returned for cleanup
    const intervalId = setInterval(() => {
      fetchQueueData();
      setRefreshCount((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(intervalId); // FIX: Cleanup on unmount
  }, []);

  const groupedTokens = tokens.reduce((groups, token) => {
    const patientName = token.patient?.name || 'Unknown';
    const key = token.id;
    if (!groups['all']) {
      groups['all'] = { waiting: [], calling: null };
    }
    if (token.status === 'calling') {
      groups['all'].calling = token;
    } else if (token.status === 'waiting') {
      groups['all'].waiting.push(token);
    }
    return groups;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">
        <div className="glass p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Live Public Monitor Board
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Real-time queue board. Auto-syncs every 3 seconds.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wide border border-teal-500/20">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Auto Refreshing
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 text-xs font-mono">
              Polls: {refreshCount}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div><strong>Sync Error:</strong> {error}</div>
          </div>
        )}

        {loading && tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-400">Loading active token queues...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="glass p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Bell className="h-12 w-12 text-slate-400 mx-auto animate-bounce" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">No Active Tokens</h3>
            <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
              No patient check-ins registered for today.
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden p-6">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-4">Today's Queue</h3>
            <div className="flex flex-wrap gap-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className={`px-4 py-3 rounded-xl border text-sm font-bold ${
                    token.status === 'called'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  #{token.tokenNumber} — {token.patient?.name || 'Unknown'}
                  <span className="block text-xxs font-normal mt-0.5 uppercase tracking-wide opacity-60">{token.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}