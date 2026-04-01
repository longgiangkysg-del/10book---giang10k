/**
 * Public Book Service — Fetch book data without authentication
 * Used for public book pages (SEO) where visitors don't need to log in.
 */
import { supabase } from './supabaseClient';
import { Book, DetailedBookAnalysis } from '../types';

export interface PublicBookData {
    id: string;
    title: string;
    author: string;
    tags: string[];
    analysis: DetailedBookAnalysis;
    coverImage?: string;
    savesCount: number;
}

export const publicBookService = {
    /**
     * Fetch a single analyzed book for public display.
     * Uses Supabase anon key — no auth required.
     * Returns null if book doesn't exist or isn't analyzed yet.
     */
    async fetchPublicBook(bookId: string): Promise<PublicBookData | null> {
        const { data, error } = await supabase
            .from('books')
            .select('id, title, author, tags, analysis, cover_image, user_ids, is_summarized')
            .eq('id', bookId)
            .eq('is_summarized', true)
            .single();

        if (error || !data) {
            console.error('fetchPublicBook error:', error);
            return null;
        }

        // Parse analysis if stored as text
        let analysis = data.analysis || null;
        if (typeof analysis === 'string') {
            try { analysis = JSON.parse(analysis); } catch { analysis = null; }
        }

        if (!analysis) return null;

        return {
            id: data.id,
            title: data.title,
            author: data.author,
            tags: data.tags || [],
            analysis,
            coverImage: data.cover_image || undefined,
            savesCount: (data.user_ids || []).length,
        };
    },
};
