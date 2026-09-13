export class SocialResolver {
  // Compliant lookup without scraping LinkedIn directly (ToS-safe query format)
  static generateLinkedInCompanyQuery(companyName: string): string {
    return `https://www.google.com/search?q=site:linkedin.com/company+"${encodeURIComponent(companyName)}"`;
  }

  static generateLinkedInPersonQuery(contactName: string, companyName: string): string {
    return `https://www.google.com/search?q=site:linkedin.com/in+"${encodeURIComponent(contactName)}"+"${encodeURIComponent(companyName)}"`;
  }

  static resolveCompliantSocialUrls(companyName: string, contactPerson?: string) {
    const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      linkedin_company_search: this.generateLinkedInCompanyQuery(companyName),
      linkedin_person_search: contactPerson ? this.generateLinkedInPersonQuery(contactPerson, companyName) : undefined,
      facebook_direct: `https://www.facebook.com/${cleanComp}`,
      instagram_direct: `https://www.instagram.com/${cleanComp}`,
      twitter_direct: `https://x.com/${cleanComp}`,
    };
  }
}
