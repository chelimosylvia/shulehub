import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Homepage.css';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const HUB_API = `${API_ROOT}/hub`;
const CONTACT_API = `${API_ROOT}/contact`;

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [banners, setBanners] = useState([]);
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [idx, setIdx] = useState(0);
  const [email, setEmail] = useState('');
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  const hubToken = localStorage.getItem('hub_access_token');
  const auth = hubToken ? { headers: { Authorization: `Bearer ${hubToken}` } } : null;

  useEffect(() => {
    (async () => {
      if (!hubToken) { setLoading(false); return; }
      try {
        const [b, r, c] = await Promise.all([
          axios.get(`${HUB_API}/banners`, auth),
          axios.get(`${HUB_API}/resources`, auth),
          axios.get(`${HUB_API}/live-classes`, auth),
        ]);
        setBanners(b.data);
        setResources(r.data.slice(0, 4));
        setClasses(c.data.slice(0, 3));
      } catch (e) {
        console.error(e);
        setErr('Login to the Shared Hub to see live previews.');
      } finally {
        setLoading(false);
      }
    })();
  }, [hubToken]);

  useEffect(() => {
    if (!banners.length) return;
    const id = setInterval(() => setIdx(i => (i + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setFormMessage({ text: 'Please enter your email', type: 'error' });
      return;
    }
    // Here you would typically send to your backend
    setFormMessage({ text: 'Thank you for subscribing!', type: 'success' });
    setEmail('');
    setTimeout(() => setFormMessage({ text: '', type: '' }), 5000);
  };

    // ───────────────────────── contact form state ──────────────────────────
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setSent(false);
    try {
      await axios.post(CONTACT_API, contact);
      setSent(true);
      setContact({ name: "", email: "", message: "" });
    } catch (e) {
      alert(
        e.response?.data?.error || "Failed to send message – please try again later"
      );
    } finally {
      setSending(false);
    }
  };
  const stats = [
    { value: '100+', label: 'Schools Registered' },
    { value: '5,000+', label: 'Active Students' },
    { value: '200+', label: 'Teachers' },
    { value: '1M+', label: 'Resources Shared' }
  ];

  const testimonials = [
    {
      quote: "Shulehub transformed how our school collaborates with others. The shared resources saved us hundreds of hours!",
      author: "James Mwangi",
      role: "Principal, Nairobi High"
    },
    {
      quote: "As a teacher, I've found incredible teaching materials and connected with educators across the country.",
      author: "Sarah Johnson",
      role: "Math Teacher"
    },
    {
      quote: "The live classes helped me understand difficult concepts better than regular school lessons.",
      author: "David Ochieng",
      role: "Grade 11 Student"
    }
  ];

  const features = [
    {
      icon: '📚',
      title: "Shared Resources",
      description: "Access a growing library of educational materials from schools nationwide"
    },
    {
      icon: '🎓',
      title: "Live Classes",
      description: "Join interactive sessions with top teachers from different schools"
    },
    {
      icon: '💬',
      title: "Discussion Forums",
      description: "Collaborate with students and teachers across the country"
    },
    {
      icon: '🏆',
      title: "Academic Competitions",
      description: "Test your knowledge in friendly interschool challenges"
    },
    {
      icon: '👨‍🏫',
      title: "Tutoring Sessions",
      description: "Get help from qualified tutors in various subjects"
    },
    {
      icon: '📊',
      title: "Performance Analytics",
      description: "Track your progress with detailed reports and insights"
    }
  ];

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="home-logo" onClick={() => navigate('/')}>
          <span className="home-logo-icon">📚</span>
          Shulehub
        </div>
        <nav className="home-nav">
          <button className="home-btn" onClick={() => navigate('/login')}>Login</button>
          <button className="home-btn" onClick={() => navigate('/register')}>Register School</button>
          <Link to="/hub" className="home-btn home-btn-primary">Shared Hub</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1>Revolutionizing Education Through Collaboration</h1>
          <p>Connect, share, and learn with schools across the country in our integrated educational platform</p>
          <div className="home-hero-buttons">
            <button className="home-btn home-btn-primary" onClick={() => navigate('/register')}>
              Get Started
            </button>
            <button className="home-btn" onClick={() => navigate('/login')}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="home-stats">
        <div className="home-stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="home-stat-item">
              <div className="home-stat-number">{stat.value}</div>
              <div className="home-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="home-features">
        <div className="home-features-container">
          <h2>Why Choose Shulehub?</h2>
          <div className="home-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="home-feature-card">
                <div className="home-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner (Existing Functionality) */}
      {hubToken && !loading && banners.length > 0 && (
        <section className="home-section">
          <div className="home-banner">
            <h3>{banners[idx].title}</h3>
            <p>{banners[idx].description}</p>
            <Link to="/hub">See all announcements →</Link>
          </div>
        </section>
      )}

      {/* Resources Preview (Existing Functionality) */}
      {hubToken && !loading && resources.length > 0 && (
        <section className="home-section">
          <h2>Latest Shared Resources</h2>
          {resources.map(r => (
            <div key={r.id} className="home-resource-item">
              <div>
                <strong>{r.title}</strong> — {r.subject}
              </div>
              <div className="home-resource-meta">
                Uploaded by {r.uploaded_by}
              </div>
            </div>
          ))}
          <Link to="/hub">Browse all resources →</Link>
        </section>
      )}

      {/* Classes Preview (Existing Functionality) */}
      {hubToken && !loading && classes.length > 0 && (
        <section className="home-section">
          <h2>Upcoming Live Classes</h2>
          {classes.map(c => (
            <div key={c.id} className="home-class-item">
              <div>
                <strong>{c.title}</strong> — {new Date(c.start_time).toLocaleString()}
              </div>
              <div className="home-class-meta">
                Hosted by {c.teacher}
              </div>
            </div>
          ))}
          <Link to="/hub">View full schedule →</Link>
        </section>
      )}

      {/* Testimonials */}
      <section className="home-testimonials">
        <div className="home-testimonials-container">
          <h2>What Our Community Says</h2>
          <div className="home-testimonial-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="home-testimonial-card">
                <div className="home-testimonial-text">
                  {testimonial.quote}
                </div>
                <div className="home-testimonial-author">
                  <div className="home-testimonial-avatar">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div className="home-testimonial-info">
                    <h4>{testimonial.author}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="home-contact">
        <div className="home-contact-container">
          <div className="home-contact-info">
            <h3>Contact Us</h3>
            <div className="home-contact-detail">
              <div className="home-contact-icon">✉️</div>
              <div className="home-contact-text">
                <h4>Email</h4>
                <a href="mailto:info@shulehub.com">info@shulehub.com</a>
              </div>
            </div>
            <div className="home-contact-detail">
              <div className="home-contact-icon">📞</div>
              <div className="home-contact-text">
                <h4>Phone</h4>
                <a href="tel:+254700123456">+254 700 123 456</a>
              </div>
            </div>
            <div className="home-contact-detail">
              <div className="home-contact-icon">📍</div>
              <div className="home-contact-text">
                <h4>Address</h4>
                <p>Pioneer Plaza, 3rd Floor<br />Nairobi, Kenya</p>
              </div>
            </div>
          </div>
          <div className="home-contact-form">
            <h3>Send Us a Message</h3>
          {sent && <p className="success-text">Thank you – we’ll get back to you soon!</p>}
          <form onSubmit={handleContactSubmit}>
            <div className="home-form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                placeholder="John Doe"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                required
              />
            </div>
            <div className="home-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                required
              />
            </div>
            <div className="home-form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                placeholder="Your message here…"
                rows={4}
                value={contact.message}
                onChange={(e) => setContact({ ...contact, message: e.target.value })}
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="home-form-submit"
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="home-cta">
        <div className="home-cta-container">
          <h2>Stay Updated</h2>
          <p>Subscribe to our newsletter for the latest updates, resources, and educational insights</p>
          <form onSubmit={handleNewsletterSubmit} className="home-footer-newsletter-form">
            <input
              type="email"
              className="home-footer-newsletter-input"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="home-footer-newsletter-button">
              Subscribe
            </button>
          </form>
          {formMessage.text && (
            <p className={`form-message ${formMessage.type}`}>
              {formMessage.text}
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-container">
          <div className="home-footer-about">
            <div className="home-footer-logo">
              <span className="home-footer-logo-icon">📚</span>
              Shulehub
            </div>
            <p>Connecting schools, teachers, and students across Kenya for collaborative learning and resource sharing.</p>
            <div className="home-footer-social">
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="Facebook">👍</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="LinkedIn">💼</a>
            </div>
          </div>
          <div className="home-footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/hub">Shared Hub</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="home-footer-links">
            <h3>Resources</h3>
            <ul>
              <li><Link to="/resources">Study Materials</Link></li>
              <li><Link to="/classes">Live Classes</Link></li>
              <li><Link to="/forums">Discussion Forums</Link></li>
              <li><Link to="/competitions">Competitions</Link></li>
              <li><Link to="/tutoring">Tutoring</Link></li>
            </ul>
          </div>
          <div className="home-footer-newsletter">
            <h3>Newsletter</h3>
            <p>Get the latest educational resources and updates straight to your inbox.</p>
            <form onSubmit={handleNewsletterSubmit} className="home-footer-newsletter-form">
              <input
                type="email"
                className="home-footer-newsletter-input"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="home-footer-newsletter-button">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>© {new Date().getFullYear()} Shulehub. All rights reserved.</p>
        </div>
      </footer>

      {/* Error Message */}
      {err && <div className="home-error">{err}</div>}
    </div>
  );
}