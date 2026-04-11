/**
 * Bookmarks Service
 * Manages user bookmarks and categories in Supabase
 */

import { supabase } from '@/lib/supabase';
import { pgOr } from '@/lib/utils';

export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  favicon_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkCategory {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface CreateBookmarkData {
  title: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  favicon_url?: string;
}

export interface CreateCategoryData {
  name: string;
  icon?: string;
  color?: string;
}

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: 'Tools', icon: 'Wrench', color: '#3b82f6' },
  { name: 'CVEs', icon: 'Shield', color: '#ef4444' },
  { name: 'News', icon: 'Newspaper', color: '#10b981' },
  { name: 'Cyber', icon: 'Terminal', color: '#8b5cf6' },
  { name: 'Research', icon: 'BookOpen', color: '#f59e0b' },
  { name: 'Documentation', icon: 'FileText', color: '#06b6d4' },
  { name: 'General', icon: 'Folder', color: '#6b7280' },
];

// Default bookmarks for new users
export const DEFAULT_BOOKMARKS = [
  {
    title: 'Free Computer Books - Information Technology',
    url: 'https://freecomputerbooks.tradepub.com/category/information-technology/1207/',
    description: 'Free IT books, whitepapers, and resources covering programming, networking, security, and more',
    category: 'Research',
    tags: ['books', 'learning', 'IT', 'free resources', 'education'],
  },
  {
    title: 'Hacking: Computer Hacking Beginners Guide',
    url: 'https://vdoc.pub/download/hacking-computer-hacking-beginners-guide-1us5drffnmt8',
    description: 'Beginner\'s guide to computer hacking and cybersecurity fundamentals',
    category: 'Cyber',
    tags: ['hacking', 'cybersecurity', 'beginner', 'tutorial', 'ethical hacking'],
  },
];

class BookmarksService {
  /**
   * Get all bookmarks for the current user
   */
  async getBookmarks(): Promise<Bookmark[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch bookmarks:', error);
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get bookmarks by category
   */
  async getBookmarksByCategory(category: string): Promise<Bookmark[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch bookmarks by category:', error);
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search bookmarks by title, url, or description
   */
  async searchBookmarks(query: string): Promise<Bookmark[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .or(`title.ilike.%${pgOr(query)}%,url.ilike.%${pgOr(query)}%,description.ilike.%${pgOr(query)}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to search bookmarks:', error);
      throw new Error(`Failed to search bookmarks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new bookmark
   */
  async createBookmark(bookmarkData: CreateBookmarkData): Promise<Bookmark> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        ...bookmarkData,
        tags: bookmarkData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create bookmark:', error);
      throw new Error(`Failed to create bookmark: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a bookmark
   */
  async updateBookmark(id: string, updates: Partial<CreateBookmarkData>): Promise<Bookmark> {
    const { data, error } = await supabase
      .from('bookmarks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update bookmark:', error);
      throw new Error(`Failed to update bookmark: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(id: string): Promise<void> {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete bookmark:', error);
      throw new Error(`Failed to delete bookmark: ${error.message}`);
    }
  }

  /**
   * Get all categories for the current user
   */
  async getCategories(): Promise<BookmarkCategory[]> {
    const { data, error } = await supabase
      .from('bookmark_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CreateCategoryData): Promise<BookmarkCategory> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('bookmark_categories')
      .insert({
        user_id: user.id,
        ...categoryData,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create category:', error);
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, updates: Partial<CreateCategoryData>): Promise<BookmarkCategory> {
    const { data, error } = await supabase
      .from('bookmark_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update category:', error);
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('bookmark_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete category:', error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Initialize default categories for a new user
   */
  async initializeDefaultCategories(): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user already has categories
    const existingCategories = await this.getCategories();
    if (existingCategories.length > 0) {
      return; // User already has categories
    }

    // Insert default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
      user_id: user.id,
      ...cat,
    }));

    const { error } = await supabase
      .from('bookmark_categories')
      .insert(categoriesToInsert);

    if (error) {
      console.error('Failed to initialize default categories:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Initialize default bookmarks for a new user
   */
  async initializeDefaultBookmarks(): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user already has bookmarks
    const existingBookmarks = await this.getBookmarks();
    if (existingBookmarks.length > 0) {
      return; // User already has bookmarks
    }

    // Make sure categories are initialized first
    await this.initializeDefaultCategories();

    // Insert default bookmarks with favicons
    const bookmarksToInsert = DEFAULT_BOOKMARKS.map(bookmark => ({
      user_id: user.id,
      ...bookmark,
      favicon_url: this.getFaviconUrl(bookmark.url),
    }));

    const { error } = await supabase
      .from('bookmarks')
      .insert(bookmarksToInsert);

    if (error) {
      console.error('Failed to initialize default bookmarks:', error);
      // Don't throw - this is not critical
    } else {
      console.log('✅ Default bookmarks initialized successfully');
    }
  }

  /**
   * Get bookmark count by category
   */
  async getBookmarkCountByCategory(): Promise<Record<string, number>> {
    const bookmarks = await this.getBookmarks();
    const counts: Record<string, number> = {};

    bookmarks.forEach(bookmark => {
      counts[bookmark.category] = (counts[bookmark.category] || 0) + 1;
    });

    return counts;
  }

  /**
   * Extract favicon URL from website
   */
  getFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Check if URL is already bookmarked
   */
  async isBookmarked(url: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('url', url)
      .limit(1);

    if (error) {
      console.error('Failed to check bookmark status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
}

// Export singleton instance
export const bookmarksService = new BookmarksService();
export default bookmarksService;
