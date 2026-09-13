export interface LeadData {
  name: string;
  business_type?: string;
  employees?: string;
  contact_person?: string;
  job_title?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedin_url?: string;
  linkedin_company_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  address?: string;
  confidence?: Record<string, 'verified' | 'ai-inferred'>;
  status?: 'queued' | 'crawling' | 'extracting' | 'enriching' | 'done' | 'error';
  error_message?: string;
}

export interface AIResponse {
  text: string;
  leads: LeadData[];
  raw?: any;
}

export interface AIAdapter {
  id: string;
  name: string;
  extractLeadData(prompt: string, apiKey: string, modelId: string): Promise<AIResponse>;
  testKey(apiKey: string, modelId?: string): Promise<{ success: boolean; message: string }>;
}
