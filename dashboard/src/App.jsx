import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Save, Trash2, FileText, Upload, Check, Sparkles } from 'lucide-react';

export default function App() {
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Single-Page Form State (All fields optional for Partial Save Rule)
  const [formData, setFormData] = useState({
    id: '',
    profile_slug: '',
    candidate_display_name: 'New Candidate',
    details: {
      country: '',
      given_names: '',
      family_name: '',
      local_given_names: '',
      local_family_name: '',
      has_preferred_name: false,
      preferred_name: '',
      address_line_1: '',
      city: '',
      state_province: '',
      postal_code: '',
      email_address: '',
      phone_device_type: 'Mobile',
      country_phone_code: '+91',
      phone_number: '',
      phone_extension: '',
      languages: '',
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      work_authorization: '',
      gender: '',
      race_ethnicity: '',
      hispanic_latino: '',
      veteran_status: '',
      disability_status: '',
      default_custom_answer: ''
    },
    employment: [
      { position: 1, job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' },
      { position: 2, job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' }
    ],
    education: [
      { school_or_university: '', degree: '', field_of_study: '', overall_result_gpa: '', from_year: '', to_year: '' }
    ],
    files: [],
    learned_fields: []
  });

  const [newLearnedLabel, setNewLearnedLabel] = useState('');
  const [newLearnedValue, setNewLearnedValue] = useState('');

  // API Key Management State
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('Extension Key');
  const [newGeneratedKey, setNewGeneratedKey] = useState('');

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (e) {
      console.error('Failed to fetch API keys:', e);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Extension Key' })
      });
      if (res.ok) {
        const data = await res.json();
        setNewGeneratedKey(data.plain_key);
        fetchApiKeys();
      }
    } catch (e) {
      alert('Failed to generate API Key');
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchApiKeys();
      }
    } catch (e) {
      alert('Failed to revoke API Key');
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        if (data.length > 0 && !activeProfileId) {
          loadProfile(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profiles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchApiKeys();
  }, []);

  const loadProfile = async (id) => {
    setActiveProfileId(id);
    setMessage('');
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (res.ok) {
        const data = await res.json();
        const dt = data.details || {};
        
        // Ensure 2 employment slots exist for UI
        const emp = data.employment || [];
        const emp1 = emp.find(e => e.position === 1) || { position: 1, job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' };
        const emp2 = emp.find(e => e.position === 2) || { position: 2, job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' };

        // Ensure 1 education slot exists for UI
        const edu = data.education && data.education.length > 0 ? data.education : [{ school_or_university: '', degree: '', field_of_study: '', overall_result_gpa: '', from_year: '', to_year: '' }];

        setFormData({
          id: data.id,
          profile_slug: data.profile_slug,
          candidate_display_name: data.candidate_display_name || '',
          details: {
            country: dt.country || '',
            given_names: dt.given_names || '',
            family_name: dt.family_name || '',
            local_given_names: dt.local_given_names || '',
            local_family_name: dt.local_family_name || '',
            has_preferred_name: !!dt.has_preferred_name,
            preferred_name: dt.preferred_name || '',
            address_line_1: dt.address_line_1 || '',
            city: dt.city || '',
            state_province: dt.state_province || '',
            postal_code: dt.postal_code || '',
            email_address: dt.email_address || '',
            phone_device_type: dt.phone_device_type || 'Mobile',
            country_phone_code: dt.country_phone_code || '+91',
            phone_number: dt.phone_number || '',
            phone_extension: dt.phone_extension || '',
            languages: dt.languages || '',
            linkedin_url: dt.linkedin_url || '',
            github_url: dt.github_url || '',
            portfolio_url: dt.portfolio_url || '',
            work_authorization: dt.work_authorization || '',
            gender: dt.gender || '',
            race_ethnicity: dt.race_ethnicity || '',
            hispanic_latino: dt.hispanic_latino || '',
            veteran_status: dt.veteran_status || '',
            disability_status: dt.disability_status || '',
            default_custom_answer: dt.default_custom_answer || ''
          },
          employment: [emp1, emp2],
          education: edu,
          files: data.files || [],
          learned_fields: data.learned_fields || []
        });
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  const handleCreateNewProfile = async () => {
    setMessage('Creating new candidate profile...');
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_display_name: 'New Candidate' })
      });
      if (res.ok) {
        const newProf = await res.json();
        setMessage(`New profile created: ${newProf.profile_slug}. Fill details and save.`);
        await fetchProfiles();
        loadProfile(newProf.id);
      }
    } catch (e) {
      setMessage('Failed to create profile');
    }
  };

  const handleDetailChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, [field]: val }
    }));
  };

  const handleEmploymentChange = (index, field, val) => {
    const next = [...formData.employment];
    next[index][field] = val;
    setFormData(prev => ({ ...prev, employment: next }));
  };

  const handleEducationChange = (index, field, val) => {
    const next = [...formData.education];
    next[index][field] = val;
    setFormData(prev => ({ ...prev, education: next }));
  };

  // PARTIAL SAVE RULE: Always succeeds regardless of empty fields!
  const handleSaveProfile = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        candidate_display_name: formData.candidate_display_name || `${formData.profile_slug} Candidate`,
        details: formData.details,
        employment: formData.employment,
        education: formData.education
      };

      const res = await fetch(`/api/profiles/${activeProfileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage('Candidate profile saved successfully!');
        fetchProfiles();
      } else {
        setMessage('Failed to save candidate profile');
      }
    } catch (e) {
      setMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfileId) return;
    if (!window.confirm(`Are you sure you want to delete profile ${formData.profile_slug}?`)) return;

    try {
      const res = await fetch(`/api/profiles/${activeProfileId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage(`Profile ${formData.profile_slug} deleted.`);
        setActiveProfileId(null);
        fetchProfiles();
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleFileUpload = async (fileKind, e) => {
    const file = e.target.files[0];
    if (!file || !activeProfileId) return;

    const data = new FormData();
    data.append('file_kind', fileKind);
    data.append('file', file);

    try {
      const res = await fetch(`/api/profiles/${activeProfileId}/files`, {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        loadProfile(activeProfileId);
        alert(`${fileKind.replace('_', ' ')} uploaded successfully!`);
      }
    } catch (e) {
      alert('File upload failed');
    }
  };

  const handleAddLearnedField = async () => {
    if (!newLearnedLabel || !newLearnedValue || !activeProfileId) {
      alert('Please enter field label and value');
      return;
    }

    try {
      const res = await fetch(`/api/profiles/${activeProfileId}/learned-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_label_text: newLearnedLabel,
          field_value: newLearnedValue
        })
      });
      if (res.ok) {
        setNewLearnedLabel('');
        setNewLearnedValue('');
        loadProfile(activeProfileId);
      }
    } catch (e) {
      alert('Failed to add learned field');
    }
  };

  const handleDeleteLearnedField = async (fieldId) => {
    try {
      const res = await fetch(`/api/profiles/${activeProfileId}/learned-fields/${fieldId}`, { method: 'DELETE' });
      if (res.ok) {
        loadProfile(activeProfileId);
      }
    } catch (e) {
      alert('Failed to delete learned field');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.2rem' }}>
          Smart Autofill Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Onboard candidates here. The extension consumes saved profiles only.
        </p>
      </div>

      {/* 1. Connection Panel */}
      <div className="white-card">
        <div className="card-title">Connection & Extension Pairing</div>
        <div className="card-subtitle">Pair API URL and API Key with Chrome Extension to manage candidate profiles</div>
        
        <div className="grid-3" style={{ alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>API URL (entered in extension settings)</label>
            <input
              type="text"
              className="form-control"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={fetchProfiles} disabled={loading}>
            <RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh Profiles'}
          </button>
          <button className="btn btn-primary" onClick={handleCreateNewProfile}>
            <Plus size={16} /> New Candidate Profile
          </button>
        </div>

        {/* Extension API Key Pairing Box */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>Extension API Key</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {apiKeys.length > 0 ? `Active Key Prefix: ${apiKeys[0].prefix}` : 'Default Key: ats_live_default_key_1234567890'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => {
                  const keyToCopy = newGeneratedKey || (apiKeys.length > 0 ? apiKeys[0].prefix : 'ats_live_default_key_1234567890');
                  navigator.clipboard.writeText(keyToCopy);
                  alert(`Copied API Key to clipboard: ${keyToCopy}`);
                }}
              >
                Copy API Key
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={handleGenerateApiKey}
              >
                Generate New Key
              </button>
            </div>
          </div>
          {newGeneratedKey && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#0d9488', fontWeight: 600 }}>
              New Key Created: <code>{newGeneratedKey}</code> (Copy now — will not be shown again in full)
            </div>
          )}
        </div>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.65rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}
      </div>

      {/* 2. Saved Candidate Profiles Pills */}
      <div className="white-card">
        <div className="card-title">Saved Candidate Profiles</div>
        <div className="card-subtitle">Click a profile to load into the single-page editor</div>

        <div className="pills-container">
          {profiles.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No profiles saved yet. Click "New Candidate Profile".</div>
          ) : (
            profiles.map(p => (
              <div
                key={p.id}
                className={`profile-pill ${activeProfileId === p.id ? 'active' : ''}`}
                onClick={() => loadProfile(p.id)}
              >
                <span>{p.profile_slug} - {p.candidate_display_name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Candidate Profile Editor (Single Page) */}
      {activeProfileId && (
        <div>
          <div className="white-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Editing Profile: {formData.profile_slug}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  All fields are optional. Partial save is supported.
                </p>
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: '260px' }}>
                <label>Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.candidate_display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, candidate_display_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Section 1: Legal Name */}
            <div className="section-divider">
              <span className="section-title">1. Legal Name</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Country / Region</label>
                <input type="text" className="form-control" value={formData.details.country || ''} onChange={(e) => handleDetailChange('country', e.target.value)} placeholder="India" />
              </div>
              <div className="form-group">
                <label>Given Name(s)</label>
                <input type="text" className="form-control" value={formData.details.given_names || ''} onChange={(e) => handleDetailChange('given_names', e.target.value)} placeholder="First / Given name" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Family Name</label>
                <input type="text" className="form-control" value={formData.details.family_name || ''} onChange={(e) => handleDetailChange('family_name', e.target.value)} placeholder="Last / Surname" />
              </div>
              <div className="form-group">
                <label>Local Given Name(s)</label>
                <input type="text" className="form-control" value={formData.details.local_given_names || ''} onChange={(e) => handleDetailChange('local_given_names', e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Local Family Name</label>
                <input type="text" className="form-control" value={formData.details.local_family_name || ''} onChange={(e) => handleDetailChange('local_family_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Preferred Name</label>
                <input type="text" className="form-control" value={formData.details.preferred_name || ''} onChange={(e) => handleDetailChange('preferred_name', e.target.value)} />
              </div>
            </div>

            {/* Section 2: Address */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">2. Address</span>
            </div>
            <div className="form-group">
              <label>Address Line 1</label>
              <input type="text" className="form-control" value={formData.details.address_line_1 || ''} onChange={(e) => handleDetailChange('address_line_1', e.target.value)} />
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>City</label>
                <input type="text" className="form-control" value={formData.details.city || ''} onChange={(e) => handleDetailChange('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label>State / Province</label>
                <input type="text" className="form-control" value={formData.details.state_province || ''} onChange={(e) => handleDetailChange('state_province', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input type="text" className="form-control" value={formData.details.postal_code || ''} onChange={(e) => handleDetailChange('postal_code', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" value={formData.details.email_address || ''} onChange={(e) => handleDetailChange('email_address', e.target.value)} />
            </div>

            {/* Section 3: Phone */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">3. Phone</span>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>Phone Device Type</label>
                <select className="form-control" value={formData.details.phone_device_type || 'Mobile'} onChange={(e) => handleDetailChange('phone_device_type', e.target.value)}>
                  <option value="Mobile">Mobile</option>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                </select>
              </div>
              <div className="form-group">
                <label>Country Phone Code</label>
                <input type="text" className="form-control" value={formData.details.country_phone_code || '+91'} onChange={(e) => handleDetailChange('country_phone_code', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" className="form-control" value={formData.details.phone_number || ''} onChange={(e) => handleDetailChange('phone_number', e.target.value)} />
              </div>
            </div>

            {/* Section 4: Employment History (Most Recent Two) */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">4. Employment History (Most Recent Two)</span>
            </div>

            {[0, 1].map((idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  Position {idx + 1}
                </h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Job Title</label>
                    <input type="text" className="form-control" value={formData.employment[idx]?.job_title || ''} onChange={(e) => handleEmploymentChange(idx, 'job_title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <input type="text" className="form-control" value={formData.employment[idx]?.company || ''} onChange={(e) => handleEmploymentChange(idx, 'company', e.target.value)} />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" className="form-control" value={formData.employment[idx]?.location || ''} onChange={(e) => handleEmploymentChange(idx, 'location', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>From Date (MM/YYYY)</label>
                    <input type="text" className="form-control" value={formData.employment[idx]?.from_date || ''} onChange={(e) => handleEmploymentChange(idx, 'from_date', e.target.value)} placeholder="01/2022" />
                  </div>
                  <div className="form-group">
                    <label>To Date (MM/YYYY)</label>
                    <input type="text" className="form-control" value={formData.employment[idx]?.to_date || ''} onChange={(e) => handleEmploymentChange(idx, 'to_date', e.target.value)} placeholder="05/2024" />
                  </div>
                </div>
              </div>
            ))}

            {/* Section 5: Education */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">5. Education</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>School or University</label>
                <input type="text" className="form-control" value={formData.education[0]?.school_or_university || ''} onChange={(e) => handleEducationChange(0, 'school_or_university', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Degree</label>
                <input type="text" className="form-control" value={formData.education[0]?.degree || ''} onChange={(e) => handleEducationChange(0, 'degree', e.target.value)} />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>Field of Study</label>
                <input type="text" className="form-control" value={formData.education[0]?.field_of_study || ''} onChange={(e) => handleEducationChange(0, 'field_of_study', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Overall Result / GPA</label>
                <input type="text" className="form-control" value={formData.education[0]?.overall_result_gpa || ''} onChange={(e) => handleEducationChange(0, 'overall_result_gpa', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Graduation Year</label>
                <input type="text" className="form-control" value={formData.education[0]?.to_year || ''} onChange={(e) => handleEducationChange(0, 'to_year', e.target.value)} placeholder="2020" />
              </div>
            </div>

            {/* Section 6: Languages */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">6. Languages</span>
            </div>
            <div className="form-group">
              <label>Languages (comma-separated)</label>
              <input type="text" className="form-control" value={formData.details.languages || ''} onChange={(e) => handleDetailChange('languages', e.target.value)} placeholder="English, Hindi, Spanish" />
            </div>

            {/* Section 7: Links and Work Authorization */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">7. Links & Work Authorization</span>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input type="url" className="form-control" value={formData.details.linkedin_url || ''} onChange={(e) => handleDetailChange('linkedin_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>GitHub URL</label>
                <input type="url" className="form-control" value={formData.details.github_url || ''} onChange={(e) => handleDetailChange('github_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Portfolio URL</label>
                <input type="url" className="form-control" value={formData.details.portfolio_url || ''} onChange={(e) => handleDetailChange('portfolio_url', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Work Authorization (Free Text)</label>
              <input type="text" className="form-control" value={formData.details.work_authorization || ''} onChange={(e) => handleDetailChange('work_authorization', e.target.value)} placeholder="Authorized to work in India & US" />
            </div>

            {/* Section 8: Voluntary Disclosures */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">8. Voluntary Disclosures</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Gender</label>
                <input type="text" className="form-control" value={formData.details.gender || ''} onChange={(e) => handleDetailChange('gender', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Race / Ethnicity</label>
                <input type="text" className="form-control" value={formData.details.race_ethnicity || ''} onChange={(e) => handleDetailChange('race_ethnicity', e.target.value)} />
              </div>
            </div>

            {/* Section 9, 10, 11: Document Uploads */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">9. Documents (Resume, Cover Letter, Portfolio)</span>
            </div>

            {['resume', 'cover_letter', 'portfolio_document'].map((kind) => {
              const fileObj = formData.files.find(f => f.file_kind === kind);
              return (
                <div key={kind} className="file-card">
                  <div className="file-info">
                    <FileText size={20} style={{ color: 'var(--primary)' }} />
                    <div>
                      <strong style={{ textTransform: 'capitalize' }}>{kind.replace('_', ' ')}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {fileObj ? fileObj.filename : 'No document attached'}
                      </div>
                    </div>
                  </div>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}>
                    <Upload size={14} /> Upload {kind.replace('_', ' ')}
                    <input type="file" onChange={(e) => handleFileUpload(kind, e)} style={{ display: 'none' }} />
                  </label>
                </div>
              );
            })}

            {/* Section 12: AI Answer Profile */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">10. AI Answer Profile</span>
            </div>
            <div className="form-group">
              <label>Default Custom Answer (Fallback for open-ended screening questions)</label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.details.default_custom_answer || ''}
                onChange={(e) => handleDetailChange('default_custom_answer', e.target.value)}
                placeholder="I am an experienced engineer enthusiastic about building scalable web products."
              />
            </div>

            {/* Section 13: Learned / Manual Fields */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">11. Learned / Manual Fields</span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              {formData.learned_fields.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '0.5rem 0' }}>No learned fields yet.</div>
              ) : (
                formData.learned_fields.map((lf) => (
                  <div key={lf.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                    <div>
                      <strong>{lf.field_label_text}:</strong> <span>{lf.field_value}</span>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteLearnedField(lf.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid-2" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Field Label Text</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Will appear after manual form entry"
                  value={newLearnedLabel}
                  onChange={(e) => setNewLearnedLabel(e.target.value)}
                />
              </div>
              <div className="grid-2" style={{ gap: '0.5rem', marginBottom: 0 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Learned value"
                  value={newLearnedValue}
                  onChange={(e) => setNewLearnedValue(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleAddLearnedField}>
                  <Plus size={16} /> Add Learned Field
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '0.85rem' }} onClick={handleSaveProfile} disabled={saving}>
              <Save size={18} /> {saving ? 'Saving Candidate Profile...' : 'Save Candidate Profile'}
            </button>
            <button className="btn btn-danger" style={{ flex: 1, padding: '0.85rem' }} onClick={handleDeleteProfile}>
              <Trash2 size={18} /> Delete Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
