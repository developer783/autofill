import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Plus, Trash2, User, Globe, ShieldAlert, GraduationCap, Briefcase, HelpCircle, FileText } from 'lucide-react';

export default function ProfileEditor({ profileId, onBack, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!profileId);
  const [error, setError] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    profile_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    visa_status: 'US Citizen',
    sponsorship_needed: false,
    work_auth_country: 'United States',
    gender: 'Decline to self-identify',
    veteran_status: 'I am not a protected veteran',
    disability_status: 'No, I do not have a disability',
    race_ethnicity: 'Decline to self-identify',
    cover_letter_text: '',
    education: [],
    experience: [],
    custom_answers: [],
    has_resume: false,
    resume_filename: ''
  });

  useEffect(() => {
    if (!profileId) return;
    const fetchDetail = async () => {
      const token = localStorage.getItem('ats_token');
      try {
        const res = await fetch(`/api/profiles/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setFormData({
          profile_name: data.profile_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          street_address: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          country: data.country || 'United States',
          linkedin_url: data.linkedin_url || '',
          github_url: data.github_url || '',
          portfolio_url: data.portfolio_url || '',
          visa_status: data.visa_status || 'US Citizen',
          sponsorship_needed: !!data.sponsorship_needed,
          work_auth_country: data.work_auth_country || 'United States',
          gender: data.gender || 'Decline to self-identify',
          veteran_status: data.veteran_status || 'I am not a protected veteran',
          disability_status: data.disability_status || 'No, I do not have a disability',
          race_ethnicity: data.race_ethnicity || 'Decline to self-identify',
          cover_letter_text: data.cover_letter_text || '',
          education: data.education || [],
          experience: data.experience || [],
          custom_answers: data.custom_answers || [],
          has_resume: !!data.resume_path,
          resume_filename: data.resume_filename || ''
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [profileId]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.profile_name) {
      alert('Please provide a profile name (e.g., Profile 1 - John Doe)');
      return;
    }
    setSaving(true);
    setError('');

    const token = localStorage.getItem('ats_token');
    const method = profileId ? 'PUT' : 'POST';
    const url = profileId ? `/api/profiles/${profileId}` : '/api/profiles';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Save failed');
      }
      const savedProfile = await res.json();
      onSaveSuccess(savedProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !profileId) return;

    setUploadingResume(true);
    const token = localStorage.getItem('ats_token');
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch(`/api/profiles/${profileId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });
      if (!res.ok) throw new Error('Resume upload failed');
      const resData = await res.json();
      setFormData(prev => ({
        ...prev,
        has_resume: true,
        resume_filename: resData.filename
      }));
      alert('Resume uploaded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingResume(false);
    }
  };

  // Education Helpers
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { school: '', degree: '', field_of_study: '', start_date: '', end_date: '', graduation_date: '', gpa: '' }
      ]
    }));
  };
  const updateEducation = (index, field, value) => {
    const next = [...formData.education];
    next[index][field] = value;
    setFormData(prev => ({ ...prev, education: next }));
  };
  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  // Experience Helpers
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, description: '' }
      ]
    }));
  };
  const updateExperience = (index, field, value) => {
    const next = [...formData.experience];
    next[index][field] = value;
    setFormData(prev => ({ ...prev, experience: next }));
  };
  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  // Custom Answers Helpers
  const addCustomAnswer = () => {
    setFormData(prev => ({
      ...prev,
      custom_answers: [
        ...prev.custom_answers,
        { question_pattern: '', answer: '' }
      ]
    }));
  };
  const updateCustomAnswer = (index, field, value) => {
    const next = [...formData.custom_answers];
    next[index][field] = value;
    setFormData(prev => ({ ...prev, custom_answers: next }));
  };
  const removeCustomAnswer = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_answers: prev.custom_answers.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading profile data...</div>;
  }

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Candidates
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Main Profile Form Card */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>Profile Identification Name *</label>
          <input
            type="text"
            className="form-control"
            placeholder='e.g., "Profile 1 - Jane Doe (Senior Dev)"'
            value={formData.profile_name}
            onChange={(e) => handleChange('profile_name', e.target.value)}
            style={{ fontSize: '1.1rem', fontWeight: '600' }}
            required
          />
        </div>

        {/* Editor Tabs Navigation */}
        <div className="editor-tabs">
          <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
            <User size={16} /> Personal Info & Links
          </button>
          <button className={`tab-btn ${activeTab === 'work_auth' ? 'active' : ''}`} onClick={() => setActiveTab('work_auth')}>
            <Globe size={16} /> Work Authorization
          </button>
          <button className={`tab-btn ${activeTab === 'eeo' ? 'active' : ''}`} onClick={() => setActiveTab('eeo')}>
            <ShieldAlert size={16} /> EEO / Self-ID
          </button>
          <button className={`tab-btn ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
            <GraduationCap size={16} /> Education ({formData.education.length})
          </button>
          <button className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>
            <Briefcase size={16} /> Experience ({formData.experience.length})
          </button>
          <button className={`tab-btn ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>
            <FileText size={16} /> Resume & Cover Letter
          </button>
          <button className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>
            <HelpCircle size={16} /> Custom Q&A ({formData.custom_answers.length})
          </button>
        </div>

        {/* Tab 1: Personal Info & Links */}
        {activeTab === 'personal' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Personal Contact Information</h3>
            <div className="grid-2">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" className="form-control" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" className="form-control" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-control" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" className="form-control" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Street Address</label>
              <input type="text" className="form-control" value={formData.street_address} onChange={(e) => handleChange('street_address', e.target.value)} />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label>City</label>
                <input type="text" className="form-control" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label>State / Province</label>
                <input type="text" className="form-control" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Postal / Zip Code</label>
                <input type="text" className="form-control" value={formData.zip_code} onChange={(e) => handleChange('zip_code', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <input type="text" className="form-control" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} />
            </div>

            <h3 style={{ fontSize: '1.1rem', margin: '1.75rem 0 1.25rem 0', color: 'white' }}>Professional Links</h3>
            <div className="grid-3">
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input type="url" className="form-control" placeholder="https://linkedin.com/in/username" value={formData.linkedin_url} onChange={(e) => handleChange('linkedin_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>GitHub URL</label>
                <input type="url" className="form-control" placeholder="https://github.com/username" value={formData.github_url} onChange={(e) => handleChange('github_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Portfolio / Personal Website</label>
                <input type="url" className="form-control" placeholder="https://candidate.dev" value={formData.portfolio_url} onChange={(e) => handleChange('portfolio_url', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Work Authorization */}
        {activeTab === 'work_auth' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Work Authorization Details</h3>
            <div className="grid-2">
              <div className="form-group">
                <label>Visa / Work Status</label>
                <select className="form-control" value={formData.visa_status} onChange={(e) => handleChange('visa_status', e.target.value)}>
                  <option value="US Citizen">US Citizen</option>
                  <option value="Permanent Resident (Green Card)">Permanent Resident (Green Card)</option>
                  <option value="H-1B Visa">H-1B Visa</option>
                  <option value="F-1 OPT">F-1 OPT</option>
                  <option value="TN Visa">TN Visa</option>
                  <option value="Authorized to work">Authorized to work</option>
                  <option value="Require Sponsorship">Require Sponsorship</option>
                </select>
              </div>

              <div className="form-group">
                <label>Work Auth Country</label>
                <input type="text" className="form-control" value={formData.work_auth_country} onChange={(e) => handleChange('work_auth_country', e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textTransform: 'none', fontSize: '1rem', color: 'white' }}>
                <input
                  type="checkbox"
                  checked={formData.sponsorship_needed}
                  onChange={(e) => handleChange('sponsorship_needed', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                Will candidate now or in the future require visa sponsorship for employment?
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: EEO / Demographic Self-ID */}
        {activeTab === 'eeo' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Voluntary Equal Employment Opportunity (EEO) Self-ID</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Many ATS forms request voluntary demographic self-identification. Values stored here will be automatically matched to corresponding ATS drop-down options.
            </p>

            <div className="grid-2">
              <div className="form-group">
                <label>Gender Identity</label>
                <select className="form-control" value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Decline to self-identify">Decline to self-identify</option>
                </select>
              </div>

              <div className="form-group">
                <label>Veteran Status</label>
                <select className="form-control" value={formData.veteran_status} onChange={(e) => handleChange('veteran_status', e.target.value)}>
                  <option value="I am a protected veteran">I am a protected veteran</option>
                  <option value="I am not a protected veteran">I am not a protected veteran</option>
                  <option value="Decline to self-identify">Decline to self-identify</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Disability Status</label>
                <select className="form-control" value={formData.disability_status} onChange={(e) => handleChange('disability_status', e.target.value)}>
                  <option value="Yes, I have a disability">Yes, I have a disability</option>
                  <option value="No, I do not have a disability">No, I do not have a disability</option>
                  <option value="Decline to self-identify">Decline to self-identify</option>
                </select>
              </div>

              <div className="form-group">
                <label>Race / Ethnicity</label>
                <select className="form-control" value={formData.race_ethnicity} onChange={(e) => handleChange('race_ethnicity', e.target.value)}>
                  <option value="White / Caucasian">White / Caucasian</option>
                  <option value="Black or African American">Black or African American</option>
                  <option value="Hispanic or Latino">Hispanic or Latino</option>
                  <option value="Asian">Asian</option>
                  <option value="Two or More Races">Two or More Races</option>
                  <option value="Decline to self-identify">Decline to self-identify</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Education */}
        {activeTab === 'education' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'white' }}>Education History</h3>
              <button className="btn btn-secondary" onClick={addEducation}>
                <Plus size={16} /> Add School / Degree
              </button>
            </div>

            {formData.education.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                No education history added yet. Click "Add School / Degree".
              </div>
            ) : (
              formData.education.map((edu, idx) => (
                <div key={idx} className="sub-item-card">
                  <button className="remove-btn" onClick={() => removeEducation(idx)}>
                    <Trash2 size={18} />
                  </button>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>School / University</label>
                      <input type="text" className="form-control" value={edu.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)} placeholder="e.g. Stanford University" />
                    </div>
                    <div className="form-group">
                      <label>Degree</label>
                      <input type="text" className="form-control" value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} placeholder="e.g. Bachelor of Science" />
                    </div>
                  </div>
                  <div className="grid-3">
                    <div className="form-group">
                      <label>Field of Study / Major</label>
                      <input type="text" className="form-control" value={edu.field_of_study} onChange={(e) => updateEducation(idx, 'field_of_study', e.target.value)} placeholder="e.g. Computer Science" />
                    </div>
                    <div className="form-group">
                      <label>Graduation Date</label>
                      <input type="text" className="form-control" value={edu.graduation_date} onChange={(e) => updateEducation(idx, 'graduation_date', e.target.value)} placeholder="YYYY-MM" />
                    </div>
                    <div className="form-group">
                      <label>GPA (optional)</label>
                      <input type="text" className="form-control" value={edu.gpa} onChange={(e) => updateEducation(idx, 'gpa', e.target.value)} placeholder="3.8" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Work Experience */}
        {activeTab === 'experience' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'white' }}>Work Experience</h3>
              <button className="btn btn-secondary" onClick={addExperience}>
                <Plus size={16} /> Add Position
              </button>
            </div>

            {formData.experience.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                No experience entries added. Click "Add Position".
              </div>
            ) : (
              formData.experience.map((exp, idx) => (
                <div key={idx} className="sub-item-card">
                  <button className="remove-btn" onClick={() => removeExperience(idx)}>
                    <Trash2 size={18} />
                  </button>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Company Name</label>
                      <input type="text" className="form-control" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} placeholder="e.g. Google" />
                    </div>
                    <div className="form-group">
                      <label>Job Title</label>
                      <input type="text" className="form-control" value={exp.title} onChange={(e) => updateExperience(idx, 'title', e.target.value)} placeholder="e.g. Senior Software Engineer" />
                    </div>
                  </div>
                  <div className="grid-3">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input type="text" className="form-control" value={exp.start_date} onChange={(e) => updateExperience(idx, 'start_date', e.target.value)} placeholder="2021-01" />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input type="text" className="form-control" value={exp.end_date} onChange={(e) => updateExperience(idx, 'end_date', e.target.value)} placeholder="2024-05" disabled={exp.is_current} />
                    </div>
                    <div className="form-group" style={{ justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', cursor: 'pointer', marginTop: '1.25rem' }}>
                        <input type="checkbox" checked={exp.is_current} onChange={(e) => updateExperience(idx, 'is_current', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                        Currently Work Here
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description / Responsibilities</label>
                    <textarea className="form-control" value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} placeholder="Key accomplishments..." />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 6: Resume & Cover Letter */}
        {activeTab === 'resume' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Resume Document Upload</h3>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
              {formData.has_resume ? (
                <div>
                  <FileText size={40} style={{ color: 'var(--success)', marginBottom: '0.75rem' }} />
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Current Resume Attached</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Filename: <strong>{formData.resume_filename}</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <Upload size={40} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Upload Resume File (PDF / DOCX)</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {!profileId ? 'Please save the profile first before attaching a resume file.' : 'File will be served dynamically to extension form fill inputs.'}
                  </p>
                </div>
              )}

              {profileId && (
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <Upload size={16} /> {uploadingResume ? 'Uploading...' : formData.has_resume ? 'Replace Resume' : 'Select Resume File'}
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: 'none' }} disabled={uploadingResume} />
                </label>
              )}
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>Cover Letter Text</h3>
            <div className="form-group">
              <label>Default Cover Letter Text</label>
              <textarea
                className="form-control"
                rows={6}
                value={formData.cover_letter_text}
                onChange={(e) => handleChange('cover_letter_text', e.target.value)}
                placeholder="Dear Hiring Team, I am writing to express my enthusiastic interest in..."
              />
            </div>
          </div>
        )}

        {/* Tab 7: Custom Q&A Pattern Matcher */}
        {activeTab === 'qa' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'white' }}>Custom Screening Questions & Answers</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Define fuzzy question keywords (e.g. "salary", "why work here", "notice period") and exact answers to autofill ATS screening prompts.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={addCustomAnswer}>
                <Plus size={16} /> Add Rule
              </button>
            </div>

            {formData.custom_answers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                No custom question rules configured. Click "Add Rule".
              </div>
            ) : (
              formData.custom_answers.map((qa, idx) => (
                <div key={idx} className="sub-item-card">
                  <button className="remove-btn" onClick={() => removeCustomAnswer(idx)}>
                    <Trash2 size={18} />
                  </button>
                  <div className="form-group">
                    <label>Question Keyword / Pattern</label>
                    <input
                      type="text"
                      className="form-control"
                      value={qa.question_pattern}
                      onChange={(e) => updateCustomAnswer(idx, 'question_pattern', e.target.value)}
                      placeholder='e.g. "desired salary" or "notice period"'
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Autofill Answer</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={qa.answer}
                      onChange={(e) => updateCustomAnswer(idx, 'answer', e.target.value)}
                      placeholder="e.g. $150,000 / 2 weeks"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
