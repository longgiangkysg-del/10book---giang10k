#!/usr/bin/env node
/**
 * Claude Code Book Analyzer - CLI Script
 *
 * Dùng Claude Code để phân tích sách và lưu vào Supabase.
 *
 * Usage:
 *   node scripts/claude-analyze.mjs list              # Liệt kê sách
 *   node scripts/claude-analyze.mjs save <bookId> <jsonFile>  # Lưu analysis
 *   node scripts/claude-analyze.mjs login             # Đăng nhập lấy session
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const supabaseUrl = 'https://luhgjdvorwgridljhoar.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Thiếu SUPABASE_SERVICE_KEY. Set env trước khi chạy.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ═══════════════════════════════════════════════════════════
// BOOK OPERATIONS (service role = bypass RLS)
// ═══════════════════════════════════════════════════════════

async function listBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, is_summarized, tags')
    .order('title');

  if (error) throw new Error(`Query failed: ${error.message}`);

  console.log('\n📚 Danh sách sách:');
  console.log('─'.repeat(80));

  const unanalyzed = [];
  const analyzed = [];

  for (const book of data) {
    if (book.is_summarized) {
      analyzed.push(book);
    } else {
      unanalyzed.push(book);
    }
  }

  if (unanalyzed.length > 0) {
    console.log('\n🔴 CHƯA PHÂN TÍCH:');
    for (const b of unanalyzed) {
      console.log(`  ${b.id.substring(0, 8)}  "${b.title}" — ${b.author}  [${(b.tags || []).join(', ')}]`);
    }
  }

  if (analyzed.length > 0) {
    console.log('\n🟢 ĐÃ PHÂN TÍCH:');
    for (const b of analyzed) {
      console.log(`  ${b.id.substring(0, 8)}  "${b.title}" — ${b.author}`);
    }
  }

  console.log(`\nTổng: ${data.length} sách (${analyzed.length} đã phân tích, ${unanalyzed.length} chưa)`);
}

async function saveAnalysis(bookIdPrefix, jsonFilePath) {
  // Find book by ID prefix
  const { data: books, error: findErr } = await supabase
    .from('books')
    .select('id, title, author')
    .order('title');

  if (findErr) throw new Error(`Query failed: ${findErr.message}`);

  const book = books.find(b => b.id.startsWith(bookIdPrefix));
  if (!book) {
    console.error(`❌ Không tìm thấy sách với ID bắt đầu: ${bookIdPrefix}`);
    process.exit(1);
  }

  console.log(`📖 Sách: "${book.title}" — ${book.author}`);

  // Read analysis JSON
  const absPath = resolve(jsonFilePath);
  if (!existsSync(absPath)) {
    console.error(`❌ File không tồn tại: ${absPath}`);
    process.exit(1);
  }

  const analysis = JSON.parse(readFileSync(absPath, 'utf8'));

  // Validate structure
  const requiredKeys = ['bookMeta', 'centralThesis', 'knowledgeArchitecture', 'ideaSystem'];
  const missing = requiredKeys.filter(k => !analysis[k]);
  if (missing.length > 0) {
    console.error(`❌ Analysis JSON thiếu: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Add metadata
  analysis._metadata = {
    analyzedBy: 'Claude Code (Opus)',
    analyzedAt: new Date().toISOString(),
    version: 'claude-code-v1'
  };

  // Save to Supabase
  const { error: updateErr } = await supabase
    .from('books')
    .update({
      analysis: JSON.stringify(analysis),
      is_summarized: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', book.id);

  if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

  console.log(`✅ Đã lưu phân tích cho "${book.title}"`);
  console.log(`   📊 ${analysis.knowledgeArchitecture?.length || 0} phần kiến thức`);
  console.log(`   💡 ${analysis.ideaSystem?.length || 0} ý tưởng`);
}

// ═══════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════

const [,, command, ...args] = process.argv;

try {
  switch (command) {
    case 'list':
      await listBooks();
      break;
    case 'save':
      if (args.length < 2) {
        console.error('Usage: node claude-analyze.mjs save <bookIdPrefix> <analysis.json>');
        process.exit(1);
      }
      await saveAnalysis(args[0], args[1]);
      break;
    default:
      console.log(`
📚 Claude Code Book Analyzer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands:
  list              Liệt kê tất cả sách
  save <id> <file>  Lưu analysis JSON vào sách (id prefix OK)

Workflow:
  1. node scripts/claude-analyze.mjs list
  2. Claude Code phân tích sách → tạo file JSON
  3. node scripts/claude-analyze.mjs save <bookId> analysis.json
      `);
  }
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}
