/**
 * Export PDF utility — dùng window.print() với custom print CSS
 * Không cần thư viện ngoài, hỗ trợ mọi browser.
 * Footer luôn có link: 10k.giauco.vn
 */

interface BookAnalysis {
    centralThesis?: { oneLiner?: string; expanded?: string };
    bookMeta?: {
        estimatedReadingTime?: number;
        difficultyLevel?: string;
        bookType?: string;
        targetAudience?: string;
    };
    knowledgeArchitecture?: Array<{
        partNumber?: number;
        partTitle?: string;
        coreMessage?: string;
        content?: string;
    }>;
    ideaSystem?: Array<{
        ideaNumber?: number;
        name?: string;
        category?: string;
        description?: string;
        protocol?: string;
        whenToUse?: string;
        commonMistakes?: string[];
    }>;
    criticalAnalysis?: {
        strengths?: string[];
        weaknesses?: string[];
        counterArguments?: string[];
    };
    personalizedInsights?: {
        relevanceScore?: number;
        relevanceExplanation?: string;
        customActionPlan?: Array<{
            timeframe?: string;
            action?: string;
            expectedOutcome?: string;
        }>;
    };
    executiveSummary?: {
        forBusy?: string;
        ifOnlyOneThing?: string;
    };
}

function escapeHtml(text: string): string {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br/>');
}

function nl2p(text: string): string {
    if (!text) return '';
    return text.split(/\n\n+/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

export function exportBookToPdf(bookTitle: string, author: string, analysis: BookAnalysis): void {
    const SITE_URL = '10k.giauco.vn';
    const now = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Build HTML sections ──────────────────────────────────────

    const metaSection = analysis.bookMeta ? `
    <div class="meta-grid">
      ${analysis.bookMeta.estimatedReadingTime ? `<div class="meta-item"><span class="meta-label">Thời gian đọc</span><span class="meta-value">${analysis.bookMeta.estimatedReadingTime} giờ</span></div>` : ''}
      ${analysis.bookMeta.difficultyLevel ? `<div class="meta-item"><span class="meta-label">Độ khó</span><span class="meta-value">${escapeHtml(analysis.bookMeta.difficultyLevel)}</span></div>` : ''}
      ${analysis.bookMeta.bookType ? `<div class="meta-item"><span class="meta-label">Loại sách</span><span class="meta-value">${escapeHtml(analysis.bookMeta.bookType)}</span></div>` : ''}
      ${analysis.bookMeta.targetAudience ? `<div class="meta-item"><span class="meta-label">Đối tượng</span><span class="meta-value">${escapeHtml(analysis.bookMeta.targetAudience)}</span></div>` : ''}
    </div>
  ` : '';

    const thesisSection = analysis.centralThesis ? `
    <section class="section">
      <h2 class="section-title">📌 Layer 1 · Luận điểm Cốt lõi</h2>
      <blockquote class="quote">"${escapeHtml(analysis.centralThesis.oneLiner || '')}"</blockquote>
      <div class="body-text">${nl2p(analysis.centralThesis.expanded || '')}</div>
    </section>
  ` : '';

    const knowledgeSection = analysis.knowledgeArchitecture?.length ? `
    <section class="section">
      <h2 class="section-title">🧠 Layer 2 · Kiến trúc Tri thức</h2>
      ${analysis.knowledgeArchitecture.map(part => `
        <div class="knowledge-part">
          <div class="part-header">
            <span class="part-number">0${part.partNumber}</span>
            <div>
              <h3 class="part-title">${escapeHtml(part.partTitle || '')}</h3>
              ${part.coreMessage ? `<p class="part-core">${escapeHtml(part.coreMessage)}</p>` : ''}
            </div>
          </div>
          <div class="body-text">${nl2p(part.content || '')}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

    const ideasSection = analysis.ideaSystem?.length ? `
    <section class="section">
      <h2 class="section-title">💡 Layer 3 · Hệ thống Ý tưởng</h2>
      ${analysis.ideaSystem.map(idea => `
        <div class="idea-card">
          <div class="idea-header">
            <span class="idea-number">${idea.ideaNumber}</span>
            <div>
              <h3 class="idea-name">${escapeHtml(idea.name || '')}</h3>
              ${idea.category ? `<span class="idea-category">${escapeHtml(idea.category)}</span>` : ''}
            </div>
          </div>
          <div class="body-text">${nl2p(idea.description || '')}</div>
          ${idea.protocol ? `
            <div class="protocol-box">
              <p class="protocol-label">⚡ Giao thức thực hiện</p>
              <div class="body-text">${nl2p(idea.protocol)}</div>
            </div>
          ` : ''}
          ${idea.whenToUse ? `<p class="when-to-use">✅ Khi nào dùng: ${escapeHtml(idea.whenToUse)}</p>` : ''}
          ${idea.commonMistakes?.length ? `
            <div class="mistakes">
              <p class="mistakes-label">⚠️ Sai lầm thường gặp:</p>
              <ul>${idea.commonMistakes.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

    const criticalSection = analysis.criticalAnalysis ? `
    <section class="section">
      <h2 class="section-title">🔍 Layer 4 · Phân tích Phản biện</h2>
      <div class="critical-grid">
        ${analysis.criticalAnalysis.strengths?.length ? `
          <div class="critical-col strengths">
            <h3 class="critical-heading">✅ Ưu điểm</h3>
            <ul>${analysis.criticalAnalysis.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${analysis.criticalAnalysis.weaknesses?.length ? `
          <div class="critical-col weaknesses">
            <h3 class="critical-heading">⚠️ Hạn chế</h3>
            <ul>${analysis.criticalAnalysis.weaknesses.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${analysis.criticalAnalysis.counterArguments?.length ? `
          <div class="critical-col counter">
            <h3 class="critical-heading">💬 Phản biện</h3>
            <ul>${analysis.criticalAnalysis.counterArguments.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    </section>
  ` : '';

    const insightsSection = analysis.personalizedInsights ? `
    <section class="section">
      <h2 class="section-title">🎯 Layer 5 · Insights Cá nhân</h2>
      <div class="relevance-score">
        <span class="score-number">${analysis.personalizedInsights.relevanceScore || 0}%</span>
        <span class="score-label">Độ tương thích</span>
      </div>
      ${analysis.personalizedInsights.relevanceExplanation ? `<div class="body-text">${nl2p(analysis.personalizedInsights.relevanceExplanation)}</div>` : ''}
      ${analysis.personalizedInsights.customActionPlan?.length ? `
        <h3 class="subsection-title">Lộ trình hành động</h3>
        <table class="action-table">
          <thead><tr><th>Giai đoạn</th><th>Hành động</th><th>Kết quả mong đợi</th></tr></thead>
          <tbody>
            ${analysis.personalizedInsights.customActionPlan.map(a => `
              <tr>
                <td class="timeframe">${escapeHtml(a.timeframe || '')}</td>
                <td>${escapeHtml(a.action || '')}</td>
                <td class="outcome">${escapeHtml(a.expectedOutcome || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </section>
  ` : '';

    const summarySection = analysis.executiveSummary ? `
    <section class="section summary-section">
      <h2 class="section-title">📋 Layer 6 · Tóm lược Tinh hoa</h2>
      ${analysis.executiveSummary.forBusy ? `
        <div class="summary-box">
          <p class="summary-label">Dành cho người bận rộn</p>
          <div class="body-text">${nl2p(analysis.executiveSummary.forBusy)}</div>
        </div>
      ` : ''}
      ${analysis.executiveSummary.ifOnlyOneThing ? `
        <blockquote class="quote final-quote">"${escapeHtml(analysis.executiveSummary.ifOnlyOneThing)}"</blockquote>
      ` : ''}
    </section>
  ` : '';

    // ── Full HTML Document ───────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(bookTitle)} — Phân tích tri thức | ${SITE_URL}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1a1a2e;
      background: #fff;
    }

    /* ── Cover Page ── */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: white;
      page-break-after: always;
    }
    .cover-logo {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 60px;
    }
    .cover-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #fbbf24;
      border: 1px solid rgba(251,191,36,0.4);
      padding: 6px 16px;
      border-radius: 100px;
      margin-bottom: 28px;
    }
    .cover-title {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 16px;
      max-width: 700px;
    }
    .cover-author {
      font-size: 16px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 48px;
    }
    .cover-divider {
      width: 60px;
      height: 2px;
      background: #fbbf24;
      margin: 0 auto 48px;
    }
    .cover-meta { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 2; }
    .cover-meta strong { color: rgba(255,255,255,0.7); }

    /* ── Content ── */
    .content { max-width: 800px; margin: 0 auto; padding: 48px 40px; }

    .section {
      margin-bottom: 48px;
      padding-bottom: 48px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section:last-child { border-bottom: none; }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f3f4f6;
    }
    .subsection-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin: 20px 0 12px;
    }

    .body-text p { margin-bottom: 12px; color: #374151; }
    .body-text p:last-child { margin-bottom: 0; }

    /* ── Cover meta grid ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 32px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9ca3af; }
    .meta-value { font-size: 13px; font-weight: 600; color: #111827; }

    /* ── Quote ── */
    .quote {
      border-left: 4px solid #3b82f6;
      padding: 16px 20px;
      background: #eff6ff;
      border-radius: 0 12px 12px 0;
      font-style: italic;
      font-size: 15px;
      color: #1e40af;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .final-quote {
      border-left-color: #f59e0b;
      background: #fffbeb;
      color: #92400e;
      font-size: 17px;
    }

    /* ── Knowledge parts ── */
    .knowledge-part {
      margin-bottom: 28px;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      break-inside: avoid;
    }
    .part-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 12px;
    }
    .part-number {
      width: 36px; height: 36px;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
      flex-shrink: 0;
    }
    .part-title { font-size: 14px; font-weight: 600; color: #111827; }
    .part-core { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* ── Ideas ── */
    .idea-card {
      margin-bottom: 28px;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      break-inside: avoid;
    }
    .idea-header {
      display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px;
    }
    .idea-number {
      width: 28px; height: 28px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 11px; flex-shrink: 0;
    }
    .idea-name { font-size: 14px; font-weight: 600; color: #111827; }
    .idea-category {
      display: inline-block;
      font-size: 9px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; color: #7c3aed;
      background: #f5f3ff; padding: 2px 8px; border-radius: 4px;
      margin-top: 2px;
    }
    .protocol-box {
      margin-top: 12px; padding: 14px;
      background: #f0fdf4; border: 1px solid #86efac;
      border-radius: 8px;
    }
    .protocol-label { font-size: 10px; font-weight: 700; color: #15803d; margin-bottom: 6px; }
    .when-to-use { font-size: 11px; color: #059669; margin-top: 10px; }
    .mistakes { margin-top: 10px; }
    .mistakes-label { font-size: 10px; font-weight: 700; color: #d97706; margin-bottom: 4px; }
    .mistakes ul { padding-left: 16px; }
    .mistakes li { font-size: 11px; color: #92400e; margin-bottom: 3px; }

    /* ── Critical ── */
    .critical-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .critical-col { padding: 16px; border-radius: 10px; }
    .strengths { background: #f0fdf4; border: 1px solid #86efac; }
    .weaknesses { background: #fff1f2; border: 1px solid #fda4af; }
    .counter { background: #eff6ff; border: 1px solid #93c5fd; }
    .critical-heading { font-size: 11px; font-weight: 700; margin-bottom: 10px; color: #111827; }
    .critical-col ul { padding-left: 14px; }
    .critical-col li { font-size: 11px; color: #374151; margin-bottom: 6px; line-height: 1.5; }

    /* ── Insights ── */
    .relevance-score {
      display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px;
    }
    .score-number { font-size: 48px; font-weight: 700; color: #4f46e5; line-height: 1; }
    .score-label { font-size: 12px; color: #6b7280; }

    /* ── Action Table ── */
    .action-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    .action-table th {
      background: #f3f4f6; padding: 10px 12px; text-align: left;
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      color: #6b7280; border-bottom: 1px solid #e5e7eb;
    }
    .action-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .action-table tr:last-child td { border-bottom: none; }
    .timeframe { font-weight: 600; color: #4f46e5; white-space: nowrap; }
    .outcome { color: #6b7280; font-size: 11px; }

    /* ── Summary ── */
    .summary-box {
      padding: 20px; background: #f9fafb; border-radius: 12px;
      border: 1px solid #e5e7eb; margin-bottom: 20px;
    }
    .summary-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding: 32px 40px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 11px;
    }
    .footer-logo {
      font-size: 14px; font-weight: 700; color: #3b82f6; margin-bottom: 6px;
    }
    .footer a { color: #3b82f6; text-decoration: none; font-weight: 600; }

    /* ── Print specific ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer { position: running(footer); }
      @page {
        size: A4;
        margin: 0;
        @bottom-center { content: element(footer); }
      }
      .knowledge-part, .idea-card { break-inside: avoid; }
      .section { break-before: auto; }
      .cover { break-after: page; }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-logo">${SITE_URL} · Phân tích tri thức</div>
    <div class="cover-badge">⚡ Powered by AI · Gemini 2.5 Pro</div>
    <h1 class="cover-title">${escapeHtml(bookTitle)}</h1>
    <p class="cover-author">Tác giả: ${escapeHtml(author)}</p>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <strong>Ngày xuất bản báo cáo:</strong> ${now}<br/>
      <strong>Nền tảng:</strong> ${SITE_URL}<br/>
      <strong>Phương pháp:</strong> 3-Agent Parallel AI Analysis · 7 Knowledge Layers
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    ${metaSection}
    ${thesisSection}
    ${knowledgeSection}
    ${ideasSection}
    ${criticalSection}
    ${insightsSection}
    ${summarySection}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-logo">10kBook</div>
    <p>Báo cáo phân tích tri thức được tạo tự động bởi AI tại <a href="https://10k.giauco.vn" target="_blank">${SITE_URL}</a></p>
    <p style="margin-top:4px; font-size:10px; color:#d1d5db;">
      © ${new Date().getFullYear()} ${SITE_URL} · Chia sẻ miễn phí · Không dùng cho mục đích thương mại
    </p>
  </div>

  <script>
    // Tự động mở print dialog sau khi load xong font
    window.onload = () => setTimeout(() => window.print(), 600);
  </script>
</body>
</html>`;

    // Mở trong tab mới để print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Vui lòng cho phép pop-up để xuất PDF. Kiểm tra thanh địa chỉ trình duyệt.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
}
