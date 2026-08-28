import React, { useState, useEffect } from 'react';
import { Search, Plus, User, FileText, Trash2, Edit3, Briefcase, GraduationCap } from 'lucide-react';

export default function ProfileList({ onSelectProfile, onCreateNew }) {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    const token = localStorage.getItem('ats_token');
    try {
      const url = search
        ? `/api/profiles?search=${encodeURIComponent(search)}`
        : '/api/profiles';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load profiles');
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProfiles();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    const token = localStorage.getItem('ats_token');
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete profile');
      setProfiles(profiles.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', fontFamily: 'Outfit' }}>Candidate Profiles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage candidate data and custom Q&A rules for browser extension autofill
          </p>
        </div>

        <button className="btn btn-primary" onClick={onCreateNew}>
          <Plus size={18} /> New Candidate Profile
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Search by candidate name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading candidate profiles...
        </div>
      ) : profiles.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <User size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No profiles found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {search ? 'No candidates match your search query.' : 'Get started by creating your first candidate profile.'}
          </p>
          <button className="btn btn-primary" onClick={onCreateNew}>
            <Plus size={18} /> Create Profile
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              className="glass-panel"
              style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onClick={() => onSelectProfile(p.id)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'white' }}>
                    {p.profile_name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.6rem' }}
                      onClick={(e) => { e.stopPropagation(); onSelectProfile(p.id); }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.6rem' }}
                      onClick={(e) => handleDelete(e, p.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <div>{(p.first_name || p.last_name) ? `${p.first_name} ${p.last_name}` : 'No full name set'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{p.email || 'No email set'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                <span className={`badge ${p.has_resume ? 'badge-success' : 'badge-warning'}`}>
                  <FileText size={12} style={{ marginRight: '4px' }} />
                  {p.has_resume ? 'Resume Attached' : 'No Resume'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
