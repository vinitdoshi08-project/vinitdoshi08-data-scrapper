import { LeadData } from '../ai/types';

export class DeduplicationService {
  static normalizeDomain(url?: string): string {
    if (!url || url === 'N/A') return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '').toLowerCase().trim();
    } catch {
      return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    }
  }

  static normalizePhone(phone?: string): string {
    if (!phone || phone === 'N/A') return '';
    return phone.replace(/\D/g, '').slice(-10); // Match last 10 digits
  }

  static isDuplicate(existingList: LeadData[], newLead: LeadData): boolean {
    const newName = (newLead.name || '').trim().toLowerCase();
    const newDomain = this.normalizeDomain(newLead.website);
    const newPhone = this.normalizePhone(newLead.phone);

    return existingList.some(item => {
      const itemName = (item.name || '').trim().toLowerCase();
      const itemDomain = this.normalizeDomain(item.website);
      const itemPhone = this.normalizePhone(item.phone);

      // Name exact match
      if (newName && itemName && newName === itemName) return true;

      // Domain match (when valid domain exists)
      if (newDomain && itemDomain && newDomain === itemDomain) return true;

      // Phone match (when normalized 10 digits match)
      if (newPhone && itemPhone && newPhone === itemPhone) return true;

      return false;
    });
  }
}
