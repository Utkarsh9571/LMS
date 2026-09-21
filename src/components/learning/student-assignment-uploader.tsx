'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StudentAssignmentUploaderProps {
  assignmentId: string;
  enrollmentId: string;
}

export function StudentAssignmentUploader({ assignmentId, enrollmentId }: StudentAssignmentUploaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/v1/student/assignments/${assignmentId}/submissions?enrollmentId=${enrollmentId}`);
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.data || []);
      }
    } catch {
      // Non-fatal if fetching submission history fails
    }
  };

  useEffect(() => {
    fetchSubmissions().finally(() => setLoading(false));
  }, [assignmentId, enrollmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Request server presigned upload key
      const initRes = await fetch(`/api/v1/student/assignments/${assignmentId}/initiate-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId,
          fileName: selectedFile.name,
          fileSizeBytes: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream',
        }),
      });

      if (!initRes.ok) {
        const text = await initRes.text();
        throw new Error(text || 'Failed to initiate file upload.');
      }

      const initJson = await initRes.json();
      const { uploadUrl, storageKey } = initJson.data;

      // 2. Upload file directly to signed target endpoint
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage destination.');
      }

      // 3. Submit storage key reference through backend endpoint
      const subRes = await fetch(`/api/v1/student/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId,
          storageKey,
          originalFileName: selectedFile.name,
          fileSizeBytes: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream',
          studentNotes,
        }),
      });

      if (!subRes.ok) {
        const text = await subRes.text();
        throw new Error(text || 'Failed to record assignment submission.');
      }

      setSelectedFile(null);
      setStudentNotes('');
      await fetchSubmissions();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting assignment';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
        <p className="text-xs text-slate-500 animate-pulse">Loading assignment details...</p>
      </div>
    );
  }

  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="text-center space-y-2">
        <span className="text-4xl">📁</span>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Assignment Submission</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Upload your assignment work. Your file will be securely stored and evaluated by instructors.
        </p>
      </div>

      {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

      {/* Submission History / Feedback */}
      {latestSubmission && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Latest Submission #{latestSubmission.submissionNumber}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
              latestSubmission.status === 'graded'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {latestSubmission.status.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            File: <strong>{latestSubmission.originalFileName}</strong> ({Math.round(latestSubmission.fileSizeBytes / 1024)} KB)
          </p>

          {latestSubmission.score !== undefined && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Grade: {latestSubmission.score} ({latestSubmission.percentageScore}%) - {latestSubmission.isPassed ? 'Passed ✓' : 'Failed'}
              </p>
              {latestSubmission.feedbackMarkdown && (
                <p className="text-slate-500 mt-1 italic">"{latestSubmission.feedbackMarkdown}"</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleUploadAndSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Select File to Upload
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Student Notes (Optional)
          </label>
          <textarea
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            disabled={uploading}
            placeholder="Add notes for your instructor..."
            className="w-full text-xs p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {uploading ? 'Uploading File...' : 'Submit Assignment 📤'}
          </button>
        </div>
      </form>
    </div>
  );
}
