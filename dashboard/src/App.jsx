import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Save, Trash2, FileText, Upload } from 'lucide-react';

export default function App() {
  const [apiUrl, setApiUrl] = useState(() => {
    let raw = (import.meta.env.VITE_API_URL || 'https://smart-autofill-api.onrender.com').trim();
    if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = `https://${raw}`;
    }
    return raw || 'https://smart-autofill-api.onrender.com';
  });
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const getEndpoint = (path) => {
    let raw = (apiUrl || import.meta.env.VITE_API_URL || 'https://smart-autofill-api.onrender.com').trim();
    if (!raw) raw = 'https://smart-autofill-api.onrender.com';

    if (!raw.includes('.') && !raw.includes('localhost') && !raw.includes('127.0.0.1')) {
      raw = `${raw}.onrender.com`;
    }

    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = `https://${raw}`;
    }

    const base = raw.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

  // Single-Page Form State (All fields optional for Partial Save Rule)
  const [formData, setFormData] = useState({
    id: '',
    profile_slug: '',
    candidate_display_name: 'New Candidate',
    details: {
      how_did_you_hear_about_us: '',
      previously_worked_here: false,
      country: '',
      given_names: '',
      family_name: '',
      local_given_names: '',
      local_family_name: '',
      has_preferred_name: false,
      preferred_name: '',
      address_line_1: '',
      city: '',
      postal_code: '',
      state: '',
      email_address: '',
      phone_device_type: 'Cellular',
      country_phone_code: '+91',
      phone_number: '',
      phone_extension: '',
      skills: '',
      websites: '',
      linkedin_url: '',
      legally_authorized_to_work: null,
      requires_employer_support: null,
      ethnicity: '',
      gender: '',
      protected_veteran_status: '',
      self_id_language: '',
      self_id_name: '',
      employee_id: '',
      self_id_date: '',
      disability_status: '',
      language: ''
    },
    work_experience: [
      { job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' }
    ],
    education: [
      { school_or_university: '', degree: '', field_of_study: '', overall_result_gpa: '', from_date: '', to_date: '' }
    ],
    files: [],
    learned_fields: []
  });

  const [newLearnedLabel, setNewLearnedLabel] = useState('');
  const [newLearnedValue, setNewLearnedValue] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(getEndpoint('/profiles'));
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
  }, [apiUrl]);

  const loadProfile = async (id) => {
    setActiveProfileId(id);
    setMessage('');
    try {
      const res = await fetch(getEndpoint(`/profiles/${id}`));
      if (res.ok) {
        const data = await res.json();
        const dt = data.details || {};

        const we = data.work_experience && data.work_experience.length > 0
          ? data.work_experience
          : [{ job_title: '', company: '', location: '', from_date: '', to_date: '', currently_work_here: false, role_description: '' }];

        const edu = data.education && data.education.length > 0
          ? data.education
          : [{ school_or_university: '', degree: '', field_of_study: '', overall_result_gpa: '', from_date: '', to_date: '' }];

        setFormData({
          id: data.id,
          profile_slug: data.profile_slug,
          candidate_display_name: data.candidate_display_name || '',
          details: {
            how_did_you_hear_about_us: dt.how_did_you_hear_about_us || '',
            previously_worked_here: dt.previously_worked_here === true,
            country: dt.country || '',
            given_names: dt.given_names || '',
            family_name: dt.family_name || '',
            local_given_names: dt.local_given_names || '',
            local_family_name: dt.local_family_name || '',
            has_preferred_name: !!dt.has_preferred_name,
            preferred_name: dt.preferred_name || '',
            address_line_1: dt.address_line_1 || '',
            city: dt.city || '',
            postal_code: dt.postal_code || '',
            state: dt.state || '',
            email_address: dt.email_address || '',
            phone_device_type: dt.phone_device_type || 'Cellular',
            country_phone_code: dt.country_phone_code || '+91',
            phone_number: dt.phone_number || '',
            phone_extension: dt.phone_extension || '',
            skills: dt.skills || '',
            websites: dt.websites || '',
            linkedin_url: dt.linkedin_url || '',
            legally_authorized_to_work: dt.legally_authorized_to_work,
            requires_employer_support: dt.requires_employer_support,
            ethnicity: dt.ethnicity || '',
            gender: dt.gender || '',
            protected_veteran_status: dt.protected_veteran_status || '',
            self_id_language: dt.self_id_language || '',
            self_id_name: dt.self_id_name || '',
            employee_id: dt.employee_id || '',
            self_id_date: dt.self_id_date || '',
            disability_status: dt.disability_status || '',
            language: dt.language || ''
          },
          work_experience: we,
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
      const res = await fetch(getEndpoint('/profiles'), {
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

  const handleWorkExperienceChange = (index, field, val) => {
    const next = [...formData.work_experience];
    next[index][field] = val;
    setFormData(prev => ({ ...prev, work_experience: next }));
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
        work_experience: formData.work_experience,
        education: formData.education
      };

      const res = await fetch(getEndpoint(`/profiles/${activeProfileId}`), {
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
      const res = await fetch(getEndpoint(`/profiles/${activeProfileId}`), { method: 'DELETE' });
      if (res.ok) {
        setMessage(`Profile ${formData.profile_slug} deleted.`);
        setActiveProfileId(null);
        fetchProfiles();
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeProfileId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds maximum 5MB limit.');
      return;
    }

    const data = new FormData();
    data.append('file_kind', 'resume');
    data.append('file', file);

    try {
      const res = await fetch(getEndpoint(`/profiles/${activeProfileId}/files`), {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        const uploadedFile = await res.json();
        setFormData(prev => {
          const otherFiles = (prev.files || []).filter(f => f.file_kind !== uploadedFile.file_kind);
          return {
            ...prev,
            files: [...otherFiles, uploadedFile]
          };
        });
        setMessage('Resume uploaded successfully!');
        await loadProfile(activeProfileId);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.detail || 'Error uploading file'}`);
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
      const res = await fetch(getEndpoint(`/profiles/${activeProfileId}/learned-fields`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_label_text: newLearnedLabel,
          field_value: newLearnedValue
        })
      });
      if (res.ok) {
        const newField = await res.json();
        setFormData(prev => ({
          ...prev,
          learned_fields: [...(prev.learned_fields || []), newField]
        }));
        setNewLearnedLabel('');
        setNewLearnedValue('');
        await loadProfile(activeProfileId);
      }
    } catch (e) {
      alert('Failed to add learned field');
    }
  };

  const handleDeleteLearnedField = async (fieldId) => {
    try {
      const res = await fetch(getEndpoint(`/profiles/${activeProfileId}/learned-fields/${fieldId}`), { method: 'DELETE' });
      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          learned_fields: (prev.learned_fields || []).filter(f => f.id !== fieldId)
        }));
        await loadProfile(activeProfileId);
      }
    } catch (e) {
      alert('Failed to delete learned field');
    }
  };

  const resumeFile = formData.files.find(f => f.file_kind === 'resume');

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
        <div className="card-title">Connection & Server Pairing</div>
        <div className="card-subtitle">Specify API URL and manage candidate profiles</div>

        <div className="grid-3" style={{ alignItems: 'flex-end', marginBottom: '0.5rem' }}>
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

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.65rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}
      </div>

      {/* 2. Saved Candidate Profiles Pills */}
      <div className="white-card">
        <div className="card-title">Saved Candidate Profiles</div>
        <div className="card-subtitle">Click a profile row to load into the single-page editor</div>

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
                  Editing Candidate Profile: {formData.profile_slug}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  All fields are optional. Partial save is always supported.
                </p>
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: '260px' }}>
                <label>Candidate Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.candidate_display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, candidate_display_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Section 1: Application Info */}
            <div className="section-divider">
              <span className="section-title">Application Info</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>How Did You Hear About Us</label>
                <select className="form-control" value={formData.details.how_did_you_hear_about_us || ''} onChange={(e) => handleDetailChange('how_did_you_hear_about_us', e.target.value)}>
                  <option value="">-- Select Option --</option>
                  <option value="Job Board">Job Board</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Website">Website</option>
                </select>
              </div>
              <div className="form-group">
                <label>Previously Worked Here</label>
                <select className="form-control" value={formData.details.previously_worked_here === true ? 'Yes' : (formData.details.previously_worked_here === false ? 'No' : '')} onChange={(e) => handleDetailChange('previously_worked_here', e.target.value === 'Yes')}>
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Section 2: Legal Name */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Legal Name</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Country / Region</label>
                <input type="text" className="form-control" value={formData.details.country || ''} onChange={(e) => handleDetailChange('country', e.target.value)} placeholder="United States" />
              </div>
              <div className="form-group">
                <label>Given Name(s)</label>
                <input type="text" className="form-control" value={formData.details.given_names || ''} onChange={(e) => handleDetailChange('given_names', e.target.value)} placeholder="First / Given Name" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Family Name</label>
                <input type="text" className="form-control" value={formData.details.family_name || ''} onChange={(e) => handleDetailChange('family_name', e.target.value)} placeholder="Last / Family Name" />
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
                <label>Has Preferred Name?</label>
                <select className="form-control" value={formData.details.has_preferred_name ? 'Yes' : 'No'} onChange={(e) => handleDetailChange('has_preferred_name', e.target.value === 'Yes')}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
            {formData.details.has_preferred_name && (
              <div className="form-group">
                <label>Preferred Name</label>
                <input type="text" className="form-control" value={formData.details.preferred_name || ''} onChange={(e) => handleDetailChange('preferred_name', e.target.value)} />
              </div>
            )}

            {/* Section 3: Address */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Address</span>
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
                <label>State</label>
                <input type="text" className="form-control" value={formData.details.state || ''} onChange={(e) => handleDetailChange('state', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input type="text" className="form-control" value={formData.details.postal_code || ''} onChange={(e) => handleDetailChange('postal_code', e.target.value)} />
              </div>
            </div>

            {/* Section 4: Email & Contact */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Email & Phone</span>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" value={formData.details.email_address || ''} onChange={(e) => handleDetailChange('email_address', e.target.value)} placeholder="candidate@example.com" />
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>Phone Device Type</label>
                <select className="form-control" value={formData.details.phone_device_type || 'Cellular'} onChange={(e) => handleDetailChange('phone_device_type', e.target.value)}>
                  <option value="Cellular">Cellular</option>
                  <option value="Home">Home</option>
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

            {/* Section 5: Work Experience */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Work Experience</span>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" className="form-control" value={formData.work_experience[0]?.job_title || ''} onChange={(e) => handleWorkExperienceChange(0, 'job_title', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" className="form-control" value={formData.work_experience[0]?.company || ''} onChange={(e) => handleWorkExperienceChange(0, 'company', e.target.value)} />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" className="form-control" value={formData.work_experience[0]?.location || ''} onChange={(e) => handleWorkExperienceChange(0, 'location', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>From Date (MM/YYYY)</label>
                  <input type="text" className="form-control" value={formData.work_experience[0]?.from_date || ''} onChange={(e) => handleWorkExperienceChange(0, 'from_date', e.target.value)} placeholder="01/2022" />
                </div>
                <div className="form-group">
                  <label>To Date (MM/YYYY)</label>
                  <input type="text" className="form-control" value={formData.work_experience[0]?.to_date || ''} onChange={(e) => handleWorkExperienceChange(0, 'to_date', e.target.value)} placeholder="Present" />
                </div>
              </div>
              <div className="form-group">
                <label>Role Description</label>
                <textarea className="form-control" rows={3} value={formData.work_experience[0]?.role_description || ''} onChange={(e) => handleWorkExperienceChange(0, 'role_description', e.target.value)} />
              </div>
            </div>

            {/* Section 6: Education */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Education</span>
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
                <label>From Date - To Date</label>
                <input type="text" className="form-control" value={formData.education[0]?.to_date || ''} onChange={(e) => handleEducationChange(0, 'to_date', e.target.value)} placeholder="2018 - 2022" />
              </div>
            </div>

            {/* Section 7: Skills */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Skills</span>
            </div>
            <div className="form-group">
              <label>Skills (Comma-separated list)</label>
              <input type="text" className="form-control" value={formData.details.skills || ''} onChange={(e) => handleDetailChange('skills', e.target.value)} placeholder="Python, React, TypeScript, PostgreSQL, Docker" />
            </div>

            {/* Section 8: Resume/CV */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Resume / CV</span>
            </div>
            <div className="file-card">
              <div className="file-info">
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <strong>Resume File</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {resumeFile ? (
                      <span>
                        <strong style={{ color: 'var(--text-heading)' }}>{resumeFile.filename}</strong>
                        {resumeFile.uploaded_at && (
                          <span style={{ marginLeft: '0.5rem', opacity: 0.85, fontSize: '0.75rem' }}>
                            (Uploaded: {new Date(resumeFile.uploaded_at).toLocaleString()})
                          </span>
                        )}
                      </span>
                    ) : (
                      'No resume attached (Max 5MB)'
                    )}
                  </div>
                </div>
              </div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}>
                <Upload size={14} /> Upload Resume
                <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.doc,.docx" />
              </label>
            </div>

            {/* Section 9: Websites */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Websites</span>
            </div>
            <div className="form-group">
              <label>Websites (Free text)</label>
              <input type="text" className="form-control" value={formData.details.websites || ''} onChange={(e) => handleDetailChange('websites', e.target.value)} placeholder="https://myportfolio.com" />
            </div>

            {/* Section 10: Social Network URLs */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Social Network URLs</span>
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input type="url" className="form-control" value={formData.details.linkedin_url || ''} onChange={(e) => handleDetailChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/username" />
            </div>

            {/* Section 11: Work Authorization */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Work Authorization</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Legally Authorized to Work?</label>
                <select className="form-control" value={formData.details.legally_authorized_to_work === true ? 'Yes' : (formData.details.legally_authorized_to_work === false ? 'No' : '')} onChange={(e) => handleDetailChange('legally_authorized_to_work', e.target.value === 'Yes')}>
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Requires Employer Sponsorship / Support?</label>
                <select className="form-control" value={formData.details.requires_employer_support === true ? 'Yes' : (formData.details.requires_employer_support === false ? 'No' : '')} onChange={(e) => handleDetailChange('requires_employer_support', e.target.value === 'Yes')}>
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Section 12: Voluntary Disclosures */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Voluntary Disclosures</span>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>Ethnicity</label>
                <select className="form-control" value={formData.details.ethnicity || ''} onChange={(e) => handleDetailChange('ethnicity', e.target.value)}>
                  <option value="">-- Select Ethnicity --</option>
                  <option value="American">American</option>
                  <option value="Asian">Asian</option>
                  <option value="African or Black">African or Black</option>
                  <option value="Decline to Disclose">Decline to Disclose</option>
                  <option value="Hispanic or Latino">Hispanic or Latino</option>
                  <option value="White">White</option>
                </select>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select className="form-control" value={formData.details.gender || ''} onChange={(e) => handleDetailChange('gender', e.target.value)}>
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Protected Veteran Status</label>
                <select className="form-control" value={formData.details.protected_veteran_status || ''} onChange={(e) => handleDetailChange('protected_veteran_status', e.target.value)}>
                  <option value="">-- Select Veteran Status --</option>
                  <option value="I identify as Veteran">I identify as Veteran</option>
                  <option value="I identify as Veteran, not protected">I identify as Veteran, not protected</option>
                  <option value="I am not a Veteran">I am not a Veteran</option>
                  <option value="I do not wish to identify">I do not wish to identify</option>
                </select>
              </div>
            </div>

            {/* Section 13: Disability Self-Identification */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Disability Self-Identification</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Self-ID Form Language</label>
                <input type="text" className="form-control" value={formData.details.self_id_language || ''} onChange={(e) => handleDetailChange('self_id_language', e.target.value)} placeholder="English" />
              </div>
              <div className="form-group">
                <label>Self-ID Legal Name</label>
                <input type="text" className="form-control" value={formData.details.self_id_name || ''} onChange={(e) => handleDetailChange('self_id_name', e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Employee ID (if applicable)</label>
                <input type="text" className="form-control" value={formData.details.employee_id || ''} onChange={(e) => handleDetailChange('employee_id', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Self-ID Date</label>
                <input type="text" className="form-control" value={formData.details.self_id_date || ''} onChange={(e) => handleDetailChange('self_id_date', e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
            </div>
            <div className="form-group">
              <label>Disability Status</label>
              <select className="form-control" value={formData.details.disability_status || ''} onChange={(e) => handleDetailChange('disability_status', e.target.value)}>
                <option value="">-- Select Status --</option>
                <option value="Yes, I have a disability, or have had one in the past">Yes, I have a disability, or have had one in the past</option>
                <option value="No, I do not have a disability and have not had one in the past">No, I do not have a disability and have not had one in the past</option>
                <option value="I do not want to answer">I do not want to answer</option>
              </select>
            </div>

            {/* Section 14: Standalone Language */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Language</span>
            </div>
            <div className="form-group">
              <label>Language* (Standalone)</label>
              <input type="text" className="form-control" value={formData.details.language || ''} onChange={(e) => handleDetailChange('language', e.target.value)} placeholder="English" />
            </div>

            {/* Section 15: Learned / Manual Fields */}
            <div className="section-divider" style={{ marginTop: '1.5rem' }}>
              <span className="section-title">Learned / Manual Fields</span>
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
