import { createChatCompletion } from './ai';
/**
 * Knowledge Base Service
 * Manages cybersecurity knowledge entries in Supabase
 */

import { supabase } from '@/lib/supabase';
import { pgOr } from '@/lib/utils';

export interface KnowledgeEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  source_url: string | null;
  source_type: 'article' | 'documentation' | 'tutorial' | 'reference' | 'research' | 'tool' | 'other' | null;
  author: string | null;
  published_date: string | null;
  importance: number;
  is_favorite: boolean;
  is_verified: boolean;
  related_cves: string[] | null;
  related_topics: string[] | null;
  attachments: any;
  metadata: any;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeInput {
  title: string;
  content: string;
  summary?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  source_url?: string;
  source_type?: KnowledgeEntry['source_type'];
  author?: string;
  published_date?: string;
  importance?: number;
  is_favorite?: boolean;
  is_verified?: boolean;
  related_cves?: string[];
  related_topics?: string[];
  metadata?: any;
}

export interface UpdateKnowledgeInput extends Partial<CreateKnowledgeInput> {
  id: string;
}

export interface KnowledgeCategoryStats {
  category: string;
  count: number;
  latest_entry: string;
}

class KnowledgeService {
  /**
   * Get all knowledge entries for the current user
   */
  async getAll(filters?: {
    category?: string;
    tags?: string[];
    is_favorite?: boolean;
    search?: string;
  }): Promise<KnowledgeEntry[]> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${pgOr(filters.search)}%,content.ilike.%${pgOr(filters.search)}%,summary.ilike.%${pgOr(filters.search)}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single knowledge entry by ID
   */
  async getById(id: string): Promise<KnowledgeEntry | null> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Increment view count
    await this.incrementViewCount(id);

    return data;
  }

  /**
   * Create a new knowledge entry
   */
  async create(input: CreateKnowledgeInput): Promise<KnowledgeEntry> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    console.log('📝 Creating knowledge entry:', input.title);

    // Generate summary if not provided
    let summary = input.summary;
    if (!summary && input.content) {
      console.log('🤖 Generating AI summary...');
      try {
        summary = await this.generateSummary(input.content);
        console.log('✅ Summary generated:', summary.substring(0, 100) + '...');
      } catch (error) {
        console.error('❌ Failed to generate summary:', error);
        summary = input.content.substring(0, 200);
      }
    }

    // Auto-generate tags if not provided
    let tags = input.tags || [];
    if (tags.length === 0) {
      console.log('🏷️  Generating AI tags...');
      try {
        tags = await this.generateTags(input.title, input.content);
        console.log('✅ Tags generated:', tags);
      } catch (error) {
        console.error('❌ Failed to generate tags:', error);
        // Fallback: extract keywords from title
        tags = input.title.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, 5);
        if (tags.length === 0) {
          tags = ['general', 'security'];
        }
        console.log('📌 Using fallback tags:', tags);
      }
    }

    console.log('💾 Saving to database...');
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([{
        user_id: user.id,
        title: input.title,
        content: input.content,
        summary: summary || input.content.substring(0, 200),
        category: input.category || 'general',
        subcategory: input.subcategory,
        tags,
        source_url: input.source_url,
        source_type: input.source_type,
        author: input.author,
        published_date: input.published_date,
        importance: input.importance || 3,
        is_favorite: input.is_favorite || false,
        is_verified: input.is_verified || false,
        related_cves: input.related_cves,
        related_topics: input.related_topics,
        metadata: input.metadata || {},
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ UilDatabase error:', error);
      throw error;
    }

    console.log('✅ Knowledge entry created successfully');
    return data;
  }

  /**
   * Update a knowledge entry
   */
  async update(input: UpdateKnowledgeInput): Promise<KnowledgeEntry> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { id, ...updates } = input;

    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string): Promise<void> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<KnowledgeCategoryStats[]> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('knowledge_base')
      .select('category, created_at')
      .eq('user_id', user.id);

    if (error) throw error;

    // Group by category
    const categoryMap = new Map<string, { count: number; latest: string }>();

    (data || []).forEach((entry) => {
      const existing = categoryMap.get(entry.category) || { count: 0, latest: entry.created_at };
      categoryMap.set(entry.category, {
        count: existing.count + 1,
        latest: entry.created_at > existing.latest ? entry.created_at : existing.latest,
      });
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      latest_entry: stats.latest,
    }));
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, is_favorite: boolean): Promise<void> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('knowledge_base')
      .update({ is_favorite })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Increment view count for an entry
   */
  private async incrementViewCount(id: string): Promise<void> {
    const { data: { session: _authSession } } = await supabase.auth.getSession();
    const user = _authSession?.user ?? null;
    if (!user) return;

    await supabase.rpc('increment_knowledge_view', {
      knowledge_id: id,
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from('knowledge_base')
        .update({
          view_count: supabase.raw('view_count + 1'),
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);
    });
  }

  /**
   */
  private async generateSummary(content: string): Promise<string> {
    try {
        const response = await createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer. Generate a concise 2-3 sentence summary of the following cybersecurity content.',
          },
          {
            role: 'user',
            content: content.substring(0, 2000), // Limit content length
          },
        ],
        model: 'llama-3.3-70b',
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || content.substring(0, 200);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return content.substring(0, 200);
    }
  }

  /**
   */
  async generateTags(title: string, content: string): Promise<string[]> {
    try {

        const response = await createChatCompletion({

        messages: [
          {
            role: 'system',
            content: `You are a cybersecurity knowledge organizer. Extract 3-7 relevant tags from the content.
Tags should be single words or short phrases like: "malware", "ransomware", "CVE", "exploitation", "mitigation", "red-team", "blue-team", etc.
Return ONLY a comma-separated list of tags, nothing else.`,
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent: ${content.substring(0, 1000)}`,
          },
        ],
        model: 'llama-3.3-70b',
        temperature: 0.3,
      });

      const tagsText = response.choices[0]?.message?.content?.trim() || '';
      console.log('📝 AI response:', tagsText);

      const tags = tagsText
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length < 30)
        .slice(0, 7);

      if (tags.length > 0) {
        console.log('✅ AI tags generated:', tags);
        return tags;
      }

      // If AI returned nothing, use smart keyword extraction
      console.log('⚠️ AI returned no tags, using smart extraction...');
      return this.extractSmartTags(title, content);
    } catch (error) {
      console.log('📌 Falling back to smart tag extraction...');
      return this.extractSmartTags(title, content);
    }
  }

  /**
   * Smart tag extraction from title and content (fallback)
   */
  private extractSmartTags(title: string, content: string): string[] {
    const combinedText = `${title} ${content}`.toLowerCase();

    // Cybersecurity-related keywords to look for
    const cybersecKeywords = [
      'malware', 'ransomware', 'phishing', 'exploit', 'vulnerability', 'cve',
      'penetration', 'pentest', 'red-team', 'blue-team', 'threat', 'attack',
      'defense', 'security', 'hacking', 'breach', 'firewall', 'encryption',
      'authentication', 'authorization', 'injection', 'xss', 'csrf', 'mitigation',
      'detection', 'prevention', 'incident', 'response', 'forensics', 'analysis',
      'windows', 'linux', 'microsoft', 'cloud', 'network', 'web', 'api',
      'database', 'sql', 'python', 'powershell', 'bash', 'azure', 'aws'
    ];

    // Find matching keywords
    const foundTags = cybersecKeywords.filter(keyword =>
      combinedText.includes(keyword)
    );

    // If we found cybersec keywords, use them
    if (foundTags.length > 0) {
      return foundTags.slice(0, 7);
    }

    // Otherwise, extract words from title
    const titleWords = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    return titleWords.length > 0 ? titleWords : ['general', 'security'];
  }

  /**
   * Save AI Agent search result to knowledge base
   */
  async saveSearchResult(params: {
    query: string;
    answer: string;
    sources: Array<{ title: string; url: string; content: string }>;
    category?: string;
  }): Promise<KnowledgeEntry> {
    // Combine answer and sources into content
    let content = `# ${params.query}\n\n`;
    content += `${params.answer}\n\n`;
    content += `## Sources\n\n`;

    params.sources.forEach((source, index) => {
      content += `### ${index + 1}. ${source.title}\n`;
      content += `${source.url}\n\n`;
      content += `${source.content.substring(0, 500)}...\n\n`;
    });

    // Auto-generate tags from query and answer
    const tags = await this.generateTags(params.query, params.answer);

    // Extract CVE references
    const cvePattern = /CVE-\d{4}-\d{4,7}/gi;
    const related_cves = [...new Set(content.match(cvePattern) || [])];

    return this.create({
      title: params.query,
      content,
      category: params.category || 'research',
      subcategory: 'ai-search',
      tags,
      source_url: params.sources[0]?.url,
      source_type: 'research',
      related_cves,
      metadata: {
        ai_generated: true,
        source_count: params.sources.length,
        query_timestamp: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const knowledgeService = new KnowledgeService();
export default knowledgeService;
