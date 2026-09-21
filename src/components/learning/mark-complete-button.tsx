'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MarkCompleteButtonProps {
  courseId: string;
  lessonId: string;
  initialCompleted: boolean;
}

export function MarkCompleteButton({ courseId, lessonId, initialCompleted }: MarkCompleteButtonProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    const targetState = !completed;

    try {
      const res = await fetch(`/api/v1/student/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: targetState }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update lesson progress.');
      }

      setCompleted(targetState);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording progress';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ${
          completed
            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? 'Updating...' : completed ? '✓ Mark as Incomplete' : 'Mark as Complete ✓'}
      </button>
    </div>
  );
}
