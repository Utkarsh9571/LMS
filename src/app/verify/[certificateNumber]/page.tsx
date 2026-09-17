import React from 'react';
import { CertificateService } from '@/core/services/certificate.service';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ certificateNumber: string }>;
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { certificateNumber } = await params;
  const cert = await CertificateService.verifyCertificatePublicly(certificateNumber);

  if (!cert) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Print Controls - Hidden during print */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            Official Authenticated Credential
          </span>
        </div>
        <button
          onClick={undefined}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-md transition-colors"
          id="print-cert-button"
        >
          Print to PDF
        </button>
      </div>

      {/* Certificate Container: Landscape styling formatted for print */}
      <div
        id="certificate-frame"
        className="w-full max-w-4xl bg-slate-950 border-4 border-amber-500/80 rounded-2xl p-8 sm:p-14 shadow-2xl relative overflow-hidden print:border-amber-600 print:text-black print:bg-white"
        style={{ aspectRatio: '1.414 / 1' }}
      >
        {/* Decorative corner accents */}
        <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-amber-400"></div>
        <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-amber-400"></div>
        <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-amber-400"></div>
        <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-amber-400"></div>

        {/* Content Layout */}
        <div className="flex flex-col items-center justify-between h-full text-center space-y-6">
          {/* Header */}
          <div>
            <div className="text-amber-400 font-serif tracking-widest text-xs uppercase mb-1">
              BIM Academy Global Credential
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-wide">
              Certificate of Completion
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              This is to formally certify that
            </p>
          </div>

          {/* Recipient Name */}
          <div className="py-2 border-b-2 border-amber-500/40 w-3/4">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-amber-300">
              {cert.studentName}
            </h2>
          </div>

          {/* Description */}
          <div className="max-w-2xl text-slate-300 text-sm sm:text-base leading-relaxed">
            has successfully fulfilled all rigorous academic curriculum milestones, practical assessments, and verified competency criteria for:
            <div className="text-xl sm:text-2xl font-bold text-white mt-2">
              {cert.courseTitle}
            </div>
            {cert.batchName && (
              <div className="text-sm text-slate-400 mt-1">
                Cohort: <span className="text-slate-200">{cert.batchName}</span> ({cert.marketCode} Market)
              </div>
            )}
          </div>

          {/* Footer Metadata & Verification */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-end pt-6 border-t border-slate-800 text-left text-xs text-slate-400">
            <div>
              <div className="font-mono text-slate-300">Certificate ID: {cert.certificateNumber}</div>
              <div>Issue Date: {new Date(cert.issuedAt).toLocaleDateString()}</div>
              <div>Market Context: {cert.marketCode}</div>
            </div>

            {cert.primaryInstructorName && (
              <div className="text-center sm:text-right mt-4 sm:mt-0">
                <div className="font-serif font-semibold text-slate-200 text-sm">
                  {cert.primaryInstructorName}
                </div>
                <div className="text-slate-500">Lead Academy Instructor</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Script for browser print button */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('print-cert-button')?.addEventListener('click', function() {
              window.print();
            });
          `
        }}
      />
    </div>
  );
}
