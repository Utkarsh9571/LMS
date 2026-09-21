'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinLiveSessionButtonProps {
  sessionId: string;
  sessionTitle: string;
  isJoinable: boolean;
}

export function JoinLiveSessionButton({
  sessionId,
  sessionTitle,
  isJoinable,
}: JoinLiveSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/student/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to join live session.');
      }

      const json = await res.json();
      const studentJoinUrl = json.data?.studentJoinUrl;

      if (!studentJoinUrl) {
        throw new Error('Join URL not provided by server.');
      }

      window.open(studentJoinUrl, '_blank', 'noopener,noreferrer');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error joining live session';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={!isJoinable || loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? (
          <span>Connecting...</span>
        ) : isJoinable ? (
          <span>🎥 Join Live Class</span>
        ) : (
          <span>🎥 Class Not Available</span>
        )}
      </button>
    </div>
  );
}
