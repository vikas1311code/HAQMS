'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import { ArrowLeft, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const { token, API_BASE_URL } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch patient records.');

        const data = await res.json();
        setPatient(data.patient || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 animate-pulse text-sm font-semibold">Loading patient records...</p>
        </main>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <p className="text-rose-500 font-semibold">{error || 'Patient not found.'}</p>
            <Link href="/dashboard" className="text-teal-600 hover:underline text-sm font-bold">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-6">

        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Patient Header */}
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-xl">
              <User className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                {patient.name}
              </h1>
              <p className="text-sm text-slate-400 font-semibold mt-0.5">
                {patient.email || 'No email'} · {patient.phone || 'No phone'}
              </p>
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-teal-600" />
            Clinical Background & Medical History
          </h2>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            {patient.medicalHistory ? (
              <p className="text-slate-700 dark:text-slate-300 leading-6 text-sm">
                {patient.medicalHistory}
              </p>
            ) : (
              <p className="text-slate-400 italic text-sm">
                No medical history recorded for this patient.
              </p>
            )}
          </div>
        </div>

        {/* Appointments History */}
        <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-teal-600" />
            Appointment Records
          </h2>

          {patient.appointments && patient.appointments.length > 0 ? (
            <div className="space-y-3">
              {patient.appointments.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {new Date(app.scheduledAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {app.notes || 'No notes provided'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide ${
                    app.status === 'completed'
                      ? 'bg-teal-500/10 text-teal-600'
                      : app.status === 'cancelled'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm text-center py-6">
              No appointment records found for this patient.
            </p>
          )}
        </div>

      </main>
    </div>
  );
}