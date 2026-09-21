'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StudentQuizRunnerProps {
  quizId: string;
  enrollmentId: string;
}

export function StudentQuizRunner({ quizId, enrollmentId }: StudentQuizRunnerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const fetchAttempts = async () => {
    try {
      const res = await fetch(`/api/v1/student/quizzes/${quizId}/attempts?enrollmentId=${enrollmentId}`);
      if (res.ok) {
        const json = await res.json();
        setAttempts(json.data || []);
      }
    } catch {
      // Non-fatal if fetching attempts history fails
    }
  };

  useEffect(() => {
    fetchAttempts().finally(() => setLoading(false));
  }, [quizId, enrollmentId]);

  const handleStartAttempt = async () => {
    setLoading(true);
    setError(null);
    setSubmissionResult(null);

    try {
      const res = await fetch(`/api/v1/student/quizzes/${quizId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to start quiz attempt.');
      }

      const json = await res.json();
      setCurrentAttempt(json.data.attempt);
      setQuestions(json.data.questions || []);
      setSelectedAnswers({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting quiz';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionToggle = (questionId: string, optionId: string, questionType: string) => {
    setSelectedAnswers((prev) => {
      const existing = prev[questionId] || [];
      if (questionType === 'single_choice' || questionType === 'true_false') {
        return { ...prev, [questionId]: [optionId] };
      } else {
        const updated = existing.includes(optionId)
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId];
        return { ...prev, [questionId]: updated };
      }
    });
  };

  const handleSubmitAttempt = async () => {
    if (!currentAttempt) return;
    setSubmitting(true);
    setError(null);

    const formattedAnswers = Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
      questionId,
      selectedOptionIds,
    }));

    try {
      const res = await fetch(`/api/v1/student/quiz-attempts/${currentAttempt._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to submit quiz attempt.');
      }

      const json = await res.json();
      setSubmissionResult(json.data);
      setCurrentAttempt(null);
      await fetchAttempts();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting quiz';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
        <p className="text-xs text-slate-500 animate-pulse">Loading quiz details...</p>
      </div>
    );
  }

  // Viewing active attempt
  if (currentAttempt && questions.length > 0) {
    return (
      <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
              Attempt #{currentAttempt.attemptNumber}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Active Quiz Attempt</h3>
          </div>
          {currentAttempt.deadlineAt && (
            <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
              Deadline: {new Date(currentAttempt.deadlineAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900 dark:text-white">Question {idx + 1}: {q.text}</span>
                <span className="text-slate-400">{q.points} pt{q.points > 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-2">
                {q.options.map((opt: any) => {
                  const isChecked = (selectedAnswers[q.id] || []).includes(opt.id);

                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleOptionToggle(q.id, opt.id, q.questionType)}
                      className={`flex items-center gap-3 p-3 rounded-md text-xs cursor-pointer transition-colors border ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type={q.questionType === 'multiple_choice' ? 'checkbox' : 'radio'}
                        checked={isChecked}
                        onChange={() => {}}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSubmitAttempt}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting Score...' : 'Submit Quiz Attempt ✓'}
          </button>
        </div>
      </div>
    );
  }

  // Displaying result or start screen
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const isPassed = Boolean(latestAttempt?.isPassed || submissionResult?.isPassed);
  const activeAttemptCount = attempts.filter((a) => a.status === 'submitted' || a.status === 'timed_out').length;

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="text-center space-y-2">
        <span className="text-4xl">📝</span>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Quiz Assessment</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Complete this quiz to test your mastery. Official scores and passing status are calculated server-side.
        </p>
      </div>

      {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

      {/* Submission Result / Latest Status */}
      {(submissionResult || latestAttempt) && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-center">
          <div className="flex justify-center items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              isPassed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              {isPassed ? 'Passed ✓' : 'Needs Improvement'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Latest Score: {submissionResult ? submissionResult.percentageScore : latestAttempt.percentageScore}%
          </p>
          <p className="text-xs text-slate-400">
            Total Attempts: {activeAttemptCount}
          </p>
        </div>
      )}

      {/* Action Button */}
      <div className="text-center">
        <button
          onClick={handleStartAttempt}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          {activeAttemptCount > 0 ? 'Retake Quiz Attempt' : 'Start Quiz Attempt'}
        </button>
      </div>
    </div>
  );
}
