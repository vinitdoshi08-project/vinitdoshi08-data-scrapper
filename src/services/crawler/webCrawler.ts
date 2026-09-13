import { HtmlExtractor, ExtractedContacts } from './htmlExtractor';

export interface CrawlResult {
  url: string;
  success: boolean;
  contacts: ExtractedContacts;
  bodyTextSnippet: string;
  error?: string;
}

export class WebCrawler {
  private static domainLastRequest: Map<string, number> = new Map();

  // Rate limiting helper per domain
  private static async respectRateLimit(domain: string, minDelayMs = 1000) {
    const last = this.domainLastRequest.get(domain) || 0;
    const now = Date.now();
    const elapsed = now - last;
    if (elapsed < minDelayMs) {
      await new Promise(r => setTimeout(r, minDelayMs - elapsed));
    }
    this.domainLastRequest.set(domain, Date.now());
  }

  static async crawlBusinessWebsite(websiteUrl: string): Promise<CrawlResult> {
    try {
      let normalized = websiteUrl.trim();
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }

      const domain = new URL(normalized).hostname;
      await this.respectRateLimit(domain, 800);

      // Fetch homepage via proxy or direct fetch with standard timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      let html = '';
      try {
        const response = await fetch(normalized, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Scrapify-Crawler/1.0 (+https://scrapify.app/bot)',
          },
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          html = await response.text();
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        // Fallback or ignore network/CORS error in browser context
      }

      // Extract raw emails, phones, and social links
      const emails = HtmlExtractor.extractEmails('', html);
      const phones = HtmlExtractor.extractPhones('', html);
      const socials = HtmlExtractor.extractSocialLinks(html);

      // Clean snippet for AI decision-maker inspection
      const cleanSnippet = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000);

      return {
        url: normalized,
        success: true,
        contacts: {
          emails,
          phones,
          ...socials,
        },
        bodyTextSnippet: cleanSnippet,
      };
    } catch (err: any) {
      return {
        url: websiteUrl,
        success: false,
        contacts: { emails: [], phones: [] },
        bodyTextSnippet: '',
        error: err.message,
      };
    }
  }
}
