import React from 'react';
import Link from 'next/link';

export default async function MockMeetingHostPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string; topic?: string }>;
}) {
  const { id = 'mock_mtg_sample', topic = 'BIM Architecture Live Class' } = await searchParams;

  return (
    <div style={{ maxWidth: '700px', margin: '60px auto', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'inline-block', padding: '4px 12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 'bold', borderRadius: '9999px', marginBottom: '16px' }}>
          Instructor Host Control (Protected)
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
          Hosting: {decodeURIComponent(topic)}
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Meeting ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{id}</code>
        </p>

        <div style={{ background: '#1e293b', borderRadius: '8px', padding: '48px 24px', textAlign: 'center', color: '#ffffff', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Instructor Broadcast Active</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
            You are broadcasting as the primary instructor. Students can join using their authenticated join link.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Host Authority: Assigned Instructor / Admin</span>
          <Link href="/" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>
            ← End Broadcast & Return
          </Link>
        </div>
      </div>
    </div>
  );
}
