import { AppShell } from '../components/AppShell';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Guide() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="page">
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <p className="eyebrow">DOCUMENTATION &amp; WORKFLOWS</p>
            <h1>Getting Started with Scrapify</h1>
            <p className="heading-copy">
              Learn how to harvest clean, structured lead lists from YouTube, local Maps, and corporate websites in 3 easy steps.
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="secondary-button">
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Step Guide Grid */}
        <div className="guide-grid">
          <div className="guide-step">
            <span className="step-number">01</span>
            <h2>Select your extraction tool</h2>
            <p>
              Choose between YouTube Scraper for channel metrics, Website Scraper for verified company emails, or Map Scraper for local business addresses and phone numbers.
            </p>
          </div>

          <div className="guide-step">
            <span className="step-number">02</span>
            <h2>Define targets &amp; keywords</h2>
            <p>
              Input target search queries, URLs, or geographic regions. You can filter by review score, phone availability, or upload timestamp to zero-in on qualified prospects.
            </p>
          </div>

          <div className="guide-step">
            <span className="step-number">03</span>
            <h2>Export clean spreadsheets</h2>
            <p>
              Download immediately as Excel (.xlsx), CSV, or JSON. All data is structured with clean columns, verified status headers, and deduplicated records.
            </p>
          </div>
        </div>

        {/* Guide Pro Note */}
        <div className="guide-note">
          <div className="note-icon">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3>Pro-Tip: Automated Daily Pipelines</h3>
            <p>
              Combine Map Scraper results with the Website Scraper to discover local businesses first, and then automatically crawl their domain names to find the owner&apos;s direct email address and LinkedIn profile.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
