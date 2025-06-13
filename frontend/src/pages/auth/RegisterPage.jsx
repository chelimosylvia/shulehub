import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Building, Mail, Phone, MapPin, Calendar, Globe, FileText } from 'lucide-react';
import './RegisterPage.css';

const SchoolRegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    county: '',
    school_type: '',
    description: '',
    website: '',
    established_year: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // Kenyan counties
  const kenyanCounties = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
    'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
    'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
    'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
    'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
  ];

  const schoolTypes = [
    { value: 'public', label: 'Public School' },
    { value: 'private', label: 'Private School' },
    { value: 'international', label: 'International School' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields validation
    const requiredFields = ['name', 'email', 'phone', 'address', 'county', 'school_type'];
    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} is required`;
      }
    });

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (basic Kenyan format)
    if (formData.phone && !/^(\+254|0)[17]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Kenyan phone number';
    }

    // Website validation
    if (formData.website && formData.website.trim() && 
        !/^https?:\/\/.+\..+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    // Established year validation
    if (formData.established_year && 
        (formData.established_year < 1800 || formData.established_year > currentYear)) {
      newErrors.established_year = `Year must be between 1800 and ${currentYear}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(null);
    setErrors({});

    try {
      // Prepare the data to send
      const submitData = {
        ...formData,
        established_year: formData.established_year ? parseInt(formData.established_year) : null
      };

      // Remove empty optional fields
      if (!submitData.description.trim()) delete submitData.description;
      if (!submitData.website.trim()) delete submitData.website;
      if (!submitData.established_year) delete submitData.established_year;

      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      console.log('API Response:', data); // Debugging log

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: data.error || 'Registration failed due to duplicate data.' });
        } else if (response.status === 400) {
          const fieldErrors = {};
          if (data.error) {
            if (data.error.includes('name')) fieldErrors.name = data.error;
            else if (data.error.includes('email')) fieldErrors.email = data.error;
            else if (data.error.includes('phone')) fieldErrors.phone = data.error;
            else if (data.error.includes('county')) fieldErrors.county = data.error;
            else if (data.error.includes('school_type')) fieldErrors.school_type = data.error;
            else fieldErrors.general = data.error;
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error || 'Registration failed. Please try again.' });
        }
        return;
      }

      // Success - Updated to properly access nested credentials
      setSuccess({
        message: data.message || 'Your school has been successfully registered!',
        school: data.school?.name || formData.name,
        school_code: data.login_credentials?.school_code,
        registration_number: data.login_credentials?.registration_number,
        login_instructions: {
          email: data.school?.email || formData.email,
          school_code: data.login_credentials?.school_code,
          registration_number: data.login_credentials?.registration_number,
          note: data.login_credentials?.instructions || 'Use these credentials to login as School Administrator'
        }
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        county: '',
        school_type: '',
        description: '',
        website: '',
        established_year: ''
      });

    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ 
        general: 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="registration-container">
        <div className="success-card">
          <div className="success-content">
            <CheckCircle className="success-icon" />
            <h2 className="success-title">School Registered Successfully!</h2>
            <div className="success-details">
              <p className="success-message">{success.message}</p>
              <div className="registration-info">
                <p><strong>School:</strong> {success.school}</p>
                <p><strong>School Code:</strong> {success.school_code}</p>
                <p><strong>Registration Number:</strong> {success.registration_number}</p>
                {success.login_instructions && (
                  <div className="login-credentials">
                    <hr style={{ margin: '1.5rem 0' }} />
                    <h4 style={{ color: '#2563eb', marginBottom: '1rem' }}>🔑 School Admin Login Details</h4>
                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0' 
                    }}>
                      <p><strong>Email:</strong> <code style={{ 
                        background: '#e2e8f0', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>{success.login_instructions.email}</code></p>
                      <p><strong>School Code:</strong> <code style={{ 
                        background: '#e2e8f0', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>{success.login_instructions.school_code}</code></p>
                      <p><strong>Registration Number:</strong> <code style={{ 
                        background: '#e2e8f0', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>{success.login_instructions.registration_number}</code></p>
                    </div>
                    <p className="credential-note" style={{ 
                      fontSize: '0.9rem', 
                      color: '#64748b', 
                      marginTop: '1rem', 
                      fontStyle: 'italic' 
                    }}>
                      📋 {success.login_instructions.note}
                    </p>
                  </div>
                )}
              </div>
              <div className="success-note">
                <p><small>⚠️ Please save these details securely. You'll need them to access your school dashboard.</small></p>
              </div>
            </div>
            <div className="success-actions">
              <button
                onClick={() => setSuccess(null)}
                className="btn btn-secondary"
              >
                Register Another School
              </button>
              <Link 
                to="/auth/login" 
                className="btn btn-primary" 
                style={{ marginLeft: '1rem' }}
              >
                Login as School Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="header-section">
          <Building className="header-icon" />
          <h1 className="main-title">Register Your School</h1>
          <p className="subtitle">Join our educational platform and manage your school efficiently</p>
        </div>

        {errors.general && (
          <div className="error-alert">
            <AlertCircle className="alert-icon" />
            <span className="alert-text">{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">School Name *</label>
                <div className="input-wrapper">
                  <Building className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="Enter school name"
                  />
                </div>
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>

              <div className="input-group">
                <label className="input-label">Email Address *</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    placeholder="school@example.com"
                  />
                </div>
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="input-wrapper">
                  <Phone className="input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`form-input ${errors.phone ? 'input-error' : ''}`}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>

              <div className="input-group">
                <label className="input-label">School Type *</label>
                <select
                  name="school_type"
                  value={formData.school_type}
                  onChange={handleInputChange}
                  className={`form-select ${errors.school_type ? 'input-error' : ''}`}
                >
                  <option value="">Select school type</option>
                  {schoolTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.school_type && <p className="error-text">{errors.school_type}</p>}
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="form-section">
            <h3 className="section-title">Location Information</h3>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">County *</label>
                <div className="input-wrapper">
                  <MapPin className="input-icon" />
                  <select
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    className={`form-select with-icon ${errors.county ? 'input-error' : ''}`}
                  >
                    <option value="">Select county</option>
                    {kenyanCounties.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>
                {errors.county && <p className="error-text">{errors.county}</p>}
              </div>

              <div className="input-group">
                <label className="input-label">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className={`form-textarea ${errors.address ? 'input-error' : ''}`}
                  placeholder="Enter complete address"
                />
                {errors.address && <p className="error-text">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h3 className="section-title">Additional Information</h3>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Website</label>
                <div className="input-wrapper">
                  <Globe className="input-icon" />
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className={`form-input ${errors.website ? 'input-error' : ''}`}
                    placeholder="https://www.school.com"
                  />
                </div>
                {errors.website && <p className="error-text">{errors.website}</p>}
              </div>

              <div className="input-group">
                <label className="input-label">Established Year</label>
                <div className="input-wrapper">
                  <Calendar className="input-icon" />
                  <select
                    name="established_year"
                    value={formData.established_year}
                    onChange={handleInputChange}
                    className={`form-select with-icon ${errors.established_year ? 'input-error' : ''}`}
                  >
                    <option value="">Select year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {errors.established_year && <p className="error-text">{errors.established_year}</p>}
              </div>

              <div className="input-group full-width">
                <label className="input-label">Description</label>
                <div className="textarea-wrapper">
                  <FileText className="textarea-icon" />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    className="form-textarea with-icon"
                    placeholder="Brief description of your school..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  address: '',
                  county: '',
                  school_type: '',
                  description: '',
                  website: '',
                  established_year: ''
                });
                setErrors({});
              }}
              className="btn btn-secondary"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Registering...
                </>
              ) : (
                'Register School'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolRegistrationForm;