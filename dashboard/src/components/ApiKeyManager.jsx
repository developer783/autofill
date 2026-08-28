import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Check, Trash2, Shield, AlertTriangle } from 'lucide-react';

export default function ApiKeyManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState('Chrome Extension Key');
  const [creating, setCreating] = useState(false);
  const [newKeyModal, setNewKeyModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const token = localStorage.getItem('ats_token');
    try {
      const res = await fetch('/api/api-keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    const token = localStorage.getItem('ats_token');
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: keyName })
      });
      if (!res.ok) throw new Error('Failed to generate key');
      const keyData = await res.json();
      setNewKeyModal(keyData);
      fetchKeys();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Extension calls using it will fail.')) return;
    const token = localStorage.getItem('ats_token');
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      fetchKeys();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', fontFamily: 'Outfit' }}>API Keys</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Generate authentication keys to pair the Chrome Extension with your candidate database
          </p>
        </div>
      </div>

      {/* Generator Form */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>Generate New API Key</h3>
        <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '240px', marginBottom: 0 }}>
            <label>Key Name / Label</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chrome Extension - Recruiter Laptop"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            <Plus size={18} /> {creating ? 'Generating...' : 'Generate API Key'}
          </button>
        </form>
      </div>

      {/* Keys Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Active Extension Keys</h3>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading keys...</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No API keys generated yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Key Label</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Prefix</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'white' }}>{k.name}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{k.prefix}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${k.revoked ? 'badge-warning' : 'badge-success'}`}>
                        {k.revoked ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {!k.revoked && (
                        <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => handleRevokeKey(k.id)}>
                          <Trash2 size={15} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Key Created Modal */}
      {newKeyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', marginBottom: '1rem' }}>
              <Shield size={28} />
              <h3 style={{ fontSize: '1.3rem', color: 'white' }}>API Key Generated</h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Copy this API key now. For security, it will <strong>never be shown again</strong>.
            </p>

            <div style={{ background: 'black', border: '1px solid var(--border-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', wordBreak: 'break-all', marginBottom: '1.5rem' }}>
              <span>{newKeyModal.plain_key}</span>
              <button
                className="btn btn-secondary"
                onClick={() => copyToClipboard(newKeyModal.plain_key)}
                style={{ padding: '0.4rem 0.8rem', marginLeft: '0.5rem', flexShrink: 0 }}
              >
                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setNewKeyModal(null)}
              style={{ width: '100%' }}
            >
              I Have Saved This Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
