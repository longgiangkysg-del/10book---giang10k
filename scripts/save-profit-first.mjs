#!/usr/bin/env node
/**
 * Save Profit First analysis to Supabase
 * Merges Agent 1 (Meta) + Agent 3 (Ideas) + keeps existing knowledge if better
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const s = createClient('https://luhgjdvorwgridljhoar.supabase.co', process.env.SUPABASE_SERVICE_KEY);
const bookId = 'c0bd1920-49ee-420f-acd3-4209787472c7';

// Read knowledge and ideas JSON files
const knowledgePath = resolve(__dirname, 'analysis-knowledge.json');
const ideasPath = resolve(__dirname, 'analysis-ideas.json');

let knowledge = null;
let ideas = null;

try { knowledge = JSON.parse(readFileSync(knowledgePath, 'utf8')); console.log('Knowledge loaded:', knowledge.knowledgeArchitecture?.length, 'parts'); } catch { console.log('No knowledge file found, will keep existing'); }
try { ideas = JSON.parse(readFileSync(ideasPath, 'utf8')); console.log('Ideas loaded:', ideas.ideaSystem?.length, 'ideas'); } catch { console.log('No ideas file found, will keep existing'); }

// Get existing analysis
const { data: current } = await s.from('books').select('analysis').eq('id', bookId).single();
let existing = {};
if (current?.analysis) {
  try { existing = JSON.parse(current.analysis); } catch {}
}

// Merge: new meta + new/existing knowledge + new/existing ideas
const merged = {
  bookMeta: {
    estimatedReadingTime: 5,
    difficultyLevel: "DỄ TIẾP CẬN",
    bookType: "THỰC HÀNH"
  },
  centralThesis: {
    oneLiner: "Thay vì chờ đợi lợi nhuận xuất hiện sau khi trừ chi phí, hãy phân bổ lợi nhuận trước tiên như một khoản cố định, rồi vận hành doanh nghiệp bằng phần còn lại.",
    expanded: existing.centralThesis?.expanded || ""
  },
  criticalAnalysis: existing.criticalAnalysis || { strengths: [], weaknesses: [], counterArguments: [] },
  personalizedInsights: existing.personalizedInsights || { relevanceScore: 0, relevanceExplanation: "", customActionPlan: [] },
  executiveSummary: existing.executiveSummary || { forBusy: "", ifOnlyOneThing: "" },
  knowledgeArchitecture: knowledge?.knowledgeArchitecture || existing.knowledgeArchitecture || [],
  ideaSystem: ideas?.ideaSystem || existing.ideaSystem || [],
  _metadata: {
    analyzedBy: 'Claude Code (Opus)',
    analyzedAt: new Date().toISOString(),
    version: 'claude-code-v1'
  }
};

console.log('\nMerged stats:');
console.log('  knowledgeParts:', merged.knowledgeArchitecture.length);
console.log('  ideas:', merged.ideaSystem.length);

const { error } = await s.from('books').update({
  analysis: JSON.stringify(merged),
  is_summarized: true,
  updated_at: new Date().toISOString()
}).eq('id', bookId);

if (error) {
  console.error('Save failed:', error.message);
  process.exit(1);
}

console.log('✅ Saved successfully!');
