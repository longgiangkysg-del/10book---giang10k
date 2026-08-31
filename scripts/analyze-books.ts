#!/usr/bin/env node
/**
 * Phân tích sách bằng Codex CLI (gói ChatGPT của anh Giang) rồi ghi thẳng Supabase.
 *
 * Chạy TRÊN MÁY, không qua web app: Codex CLI đăng nhập bằng thuê bao nên
 * không tốn tiền API. Đổi lại nó là chương trình dòng lệnh — trình duyệt và
 * Supabase Edge Function (Deno sandbox) đều không gọi được, nên đường này chỉ
 * dành cho admin làm đầy kho sách. Khách trên web vẫn dùng key riêng của họ.
 *
 * Cách dùng:
 *   export SUPABASE_SERVICE_KEY=...
 *   node scripts/analyze-books.ts list
 *   node scripts/analyze-books.ts analyze <bookIdPrefix>
 *   node scripts/analyze-books.ts analyze --all --limit 5
 *   node scripts/analyze-books.ts save <bookIdPrefix> <analysis.json>
 *
 * Cờ thêm: --model <tên model codex> · --goal "<mục tiêu người đọc>"
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMetaPrompt, buildKnowledgePrompt, buildIdeasPrompt } from '../services/analysis-prompts.ts';
import { assertAnalysisUsable, parseAnalysisJson } from '../services/analysis-guard.ts';

const SUPABASE_URL = 'https://luhgjdvorwgridljhoar.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SERVICE_KEY) {
  console.error('❌ Thiếu SUPABASE_SERVICE_KEY. Set env trước khi chạy.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

/** Mục tiêu người đọc mặc định — giữ khớp với web app để kết quả cùng giọng. */
const DEFAULT_GOAL = 'Trích xuất tri thức tối ưu và lộ trình thực thi';

/** Một agent nặng nhất (Architecture) mất vài phút; quá mốc này coi như treo. */
const AGENT_TIMEOUT_MS = 15 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// CODEX CLI
// ═══════════════════════════════════════════════════════════

/**
 * Chạy một lượt Codex không tương tác và trả về câu trả lời cuối.
 *
 * - Prompt đi qua stdin, không qua tham số dòng lệnh: prompt dài vài KB và có
 *   dấu nháy, xuống dòng, ký tự Unicode — nhét vào argv là mời gọi lỗi trích dẫn.
 * - `-s read-only` + thư mục làm việc tạm: agent này chỉ cần viết chữ, không có
 *   lý do gì để nó chạm vào repo.
 * - `-o` lấy đúng tin nhắn cuối, khỏi phải lọc log tiến trình khỏi stdout.
 */
const runCodex = (prompt: string, model?: string): Promise<string> =>
  new Promise((resolvePromise, reject) => {
    const workDir = mkdtempSync(join(tmpdir(), 'book-analyze-'));
    const outFile = join(workDir, 'answer.txt');

    const args = [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '-s', 'read-only',
      '--color', 'never',
      '-C', workDir,
      '-o', outFile,
    ];
    if (model) args.push('-m', model);

    const child = spawn('codex', args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Codex quá ${AGENT_TIMEOUT_MS / 60000} phút chưa trả lời.`));
    }, AGENT_TIMEOUT_MS);

    const finish = (err: Error | null, value?: string) => {
      clearTimeout(timer);
      rmSync(workDir, { recursive: true, force: true });
      if (err) reject(err); else resolvePromise(value!);
    };

    child.on('error', err => finish(new Error(`Không chạy được codex: ${err.message}`)));

    child.on('close', code => {
      if (code !== 0) {
        finish(new Error(`Codex thoát với mã ${code}. ${stderr.trim().slice(-400)}`));
        return;
      }
      if (!existsSync(outFile)) {
        finish(new Error('Codex chạy xong nhưng không ghi ra câu trả lời nào.'));
        return;
      }
      finish(null, readFileSync(outFile, 'utf8'));
    });

    child.stdin.end(prompt);
  });

const runAgent = async (label: string, prompt: string, model?: string) => {
  const startedAt = Date.now();
  const raw = await runCodex(prompt, model);
  const result = parseAnalysisJson(raw);
  console.log(`   ✅ ${label} — ${Math.round((Date.now() - startedAt) / 1000)}s`);
  return result;
};

// ═══════════════════════════════════════════════════════════
// SÁCH
// ═══════════════════════════════════════════════════════════

type BookRow = { id: string; title: string; author: string; is_summarized: boolean; tags?: string[] };

const fetchBooks = async (): Promise<BookRow[]> => {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, is_summarized, tags')
    .order('title');
  if (error) throw new Error(`Query failed: ${error.message}`);
  return data as BookRow[];
};

const findBook = (books: BookRow[], prefix: string) => {
  const matches = books.filter(b => b.id.startsWith(prefix));
  if (matches.length === 0) throw new Error(`Không tìm thấy sách với ID bắt đầu: ${prefix}`);
  if (matches.length > 1) throw new Error(`ID "${prefix}" khớp ${matches.length} cuốn — gõ thêm ký tự.`);
  return matches[0];
};

const listBooks = async () => {
  const books = await fetchBooks();
  const unanalyzed = books.filter(b => !b.is_summarized);
  const analyzed = books.filter(b => b.is_summarized);

  console.log('\n📚 Danh sách sách');
  console.log('─'.repeat(80));

  if (unanalyzed.length > 0) {
    console.log('\n🔴 CHƯA PHÂN TÍCH:');
    for (const b of unanalyzed) {
      console.log(`  ${b.id.substring(0, 8)}  "${b.title}" — ${b.author}  [${(b.tags || []).join(', ')}]`);
    }
  }
  if (analyzed.length > 0) {
    console.log(`\n🟢 ĐÃ PHÂN TÍCH: ${analyzed.length} cuốn`);
  }
  console.log(`\nTổng: ${books.length} sách (${analyzed.length} đã phân tích, ${unanalyzed.length} chưa)`);
};

const saveToSupabase = async (book: BookRow, analysis: any) => {
  const { error } = await supabase
    .from('books')
    .update({
      analysis: JSON.stringify(analysis),
      is_summarized: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', book.id)
    .select('id');

  if (error) throw new Error(`Update failed: ${error.message}`);

  console.log(`💾 Đã lưu "${book.title}" — ${analysis.knowledgeArchitecture?.length || 0} phần, ${analysis.ideaSystem?.length || 0} ý tưởng`);
};

/** Ba agent chạy song song cho một cuốn, đúng như web app. */
const analyzeBook = async (book: BookRow, goal: string, model?: string) => {
  console.log(`\n📖 "${book.title}" — ${book.author}`);
  console.log('   ⏳ 3 agent đang chạy song song...');

  const [meta, knowledge, ideas] = await Promise.all([
    runAgent('Overview', buildMetaPrompt(book.title, book.author, goal), model),
    runAgent('Architecture', buildKnowledgePrompt(book.title, book.author, goal), model),
    runAgent('Ideas', buildIdeasPrompt(book.title, book.author, goal), model),
  ]);

  const analysis = {
    bookMeta: meta.bookMeta,
    centralThesis: meta.centralThesis,
    criticalAnalysis: meta.criticalAnalysis,
    personalizedInsights: meta.personalizedInsights,
    executiveSummary: meta.executiveSummary,
    knowledgeArchitecture: knowledge.knowledgeArchitecture,
    ideaSystem: ideas.ideaSystem,
    _metadata: {
      provider: `Codex CLI${model ? ` (${model})` : ''}`,
      analyzedAt: new Date().toISOString(),
    },
  };

  assertAnalysisUsable(analysis, 'full');
  await saveToSupabase(book, analysis);
};

const saveFromFile = async (prefix: string, jsonFilePath: string) => {
  const book = findBook(await fetchBooks(), prefix);
  const absPath = resolve(jsonFilePath);
  if (!existsSync(absPath)) throw new Error(`File không tồn tại: ${absPath}`);

  const analysis = JSON.parse(readFileSync(absPath, 'utf8'));
  assertAnalysisUsable(analysis, 'full');
  console.log(`📖 "${book.title}" — ${book.author}`);
  await saveToSupabase(book, analysis);
};

// ═══════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════

const flagValue = (argv: string[], name: string) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};

const USAGE = `
📚 Phân tích sách bằng Codex CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  list                          Liệt kê sách
  analyze <idPrefix>            Phân tích một cuốn rồi lưu
  analyze --all [--limit N]     Phân tích các cuốn chưa có phân tích
  save <idPrefix> <file.json>   Nạp một file phân tích có sẵn

Tuỳ chọn:  --model <model>   --goal "<mục tiêu người đọc>"
Cần env:   SUPABASE_SERVICE_KEY
`;

const main = async () => {
  const [, , command, ...args] = process.argv;
  const model = flagValue(args, '--model');
  const goal = flagValue(args, '--goal') || DEFAULT_GOAL;

  switch (command) {
    case 'list':
      await listBooks();
      break;

    case 'analyze': {
      if (args.includes('--all')) {
        const limitArg = flagValue(args, '--limit');
        const limit = limitArg ? Number(limitArg) : Infinity;
        if (Number.isNaN(limit) || limit <= 0) throw new Error('--limit phải là số dương.');

        const pending = (await fetchBooks()).filter(b => !b.is_summarized).slice(0, limit);
        if (pending.length === 0) {
          console.log('✨ Không còn cuốn nào chưa phân tích.');
          break;
        }

        console.log(`🚀 Phân tích ${pending.length} cuốn (tuần tự để khỏi vắt kiệt lượt Codex)`);
        const failed: string[] = [];
        for (const [i, book] of pending.entries()) {
          console.log(`\n[${i + 1}/${pending.length}]`);
          try {
            await analyzeBook(book, goal, model);
          } catch (err: any) {
            // Một cuốn hỏng không nên chặn cả mẻ — gom lại báo ở cuối
            console.error(`   ❌ Bỏ qua: ${err.message.replace('UNKNOWN_BOOK: ', '')}`);
            failed.push(book.title);
          }
        }
        console.log(`\n🎉 Xong ${pending.length - failed.length}/${pending.length} cuốn.`);
        if (failed.length > 0) console.log(`⚠️  Không phân tích được: ${failed.join(' · ')}`);
        break;
      }

      const prefix = args[0];
      if (!prefix || prefix.startsWith('--')) throw new Error('Thiếu ID sách. Xem: analyze --all hoặc analyze <idPrefix>');
      await analyzeBook(findBook(await fetchBooks(), prefix), goal, model);
      break;
    }

    case 'save':
      if (args.length < 2) throw new Error('Usage: save <idPrefix> <analysis.json>');
      await saveFromFile(args[0], args[1]);
      break;

    default:
      console.log(USAGE);
  }
};

main().catch(err => {
  console.error('❌', err.message.replace('UNKNOWN_BOOK: ', ''));
  process.exit(1);
});
