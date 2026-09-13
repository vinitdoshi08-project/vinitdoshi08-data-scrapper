export interface ExtractedContacts {
  emails: string[];
  phones: string[];
  linkedinCompanyUrl?: string;
  linkedinContactUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
}

export class HtmlExtractor {
  static extractEmails(text: string, html = ''): string[] {
    const combined = `${text} ${html}`;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
    const matches = combined.match(emailRegex) || [];
    // Deduplicate and filter out common image asset names that look like emails
    return Array.from(
      new Set(
        matches
          .map(e => e.toLowerCase().trim())
          .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg') && !e.endsWith('.webp'))
      )
    );
  }

  static extractPhones(text: string, html = ''): string[] {
    const combined = `${text} ${html}`;
    // Common UK, US, Indian, and International phone patterns
    const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
    const matches = combined.match(phoneRegex) || [];
    return Array.from(
      new Set(
        matches
          .map(p => p.trim())
          .filter(p => p.replace(/\D/g, '').length >= 9 && p.replace(/\D/g, '').length <= 15)
      )
    );
  }

  static extractSocialLinks(html: string): {
    linkedinCompanyUrl?: string;
    linkedinContactUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
  } {
    const result: {
      linkedinCompanyUrl?: string;
      linkedinContactUrl?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
    } = {};

    const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1];
      if (url.includes('linkedin.com/company/')) {
        result.linkedinCompanyUrl = url;
      } else if (url.includes('linkedin.com/in/')) {
        result.linkedinContactUrl = url;
      } else if (url.includes('facebook.com/') && !url.includes('sharer') && !result.facebookUrl) {
        result.facebookUrl = url;
      } else if (url.includes('instagram.com/') && !result.instagramUrl) {
        result.instagramUrl = url;
      } else if ((url.includes('twitter.com/') || url.includes('x.com/')) && !url.includes('intent') && !result.twitterUrl) {
        result.twitterUrl = url;
      }
    }

    return result;
  }
}
