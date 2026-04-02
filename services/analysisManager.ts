/**
 * ═══════════════════════════════════════════════════════════
 * ANALYSIS MANAGER — Module-level singleton
 * ═══════════════════════════════════════════════════════════
 * Chạy phân tích AI độc lập với React component lifecycle.
 * 3 agent chạy song song — xong agent nào cập nhật ngay UI
 * mà không cần đợi toàn bộ.
 */

import { geminiService } from './geminiService';
import { apiKeyManager } from './apiKeyManager';

export type AnalysisStatus = 'idle' | 'processing' | 'done' | 'error';

export interface AgentProgress {
    meta: 'pending' | 'running' | 'done' | 'error';       // → Layer 1: Overview
    knowledge: 'pending' | 'running' | 'done' | 'error';  // → Layer 2: Architecture
    ideas: 'pending' | 'running' | 'done' | 'error';      // → Layer 3: Ideas
}

export type AnalysisErrorType = 'api_key' | 'quota' | 'general' | null;

export interface AnalysisState {
    status: AnalysisStatus;
    bookId: string | null;
    bookTitle: string;
    progress: string;
    /** Kết quả tích lũy — cập nhật sau mỗi agent xong */
    partialResult: any;
    result: any | null;
    error: string | null;
    /** Loại lỗi: api_key (key hết hạn/sai), quota (hết lượt free), general (lỗi khác) */
    errorType: AnalysisErrorType;
    startedAt: number | null;
    agentProgress: AgentProgress;
}

type StateListener = (state: AnalysisState) => void;

// ── Singleton State ──────────────────────────────────────────
const IDLE_AGENT: AgentProgress = { meta: 'pending', knowledge: 'pending', ideas: 'pending' };

let state: AnalysisState = {
    status: 'idle',
    bookId: null,
    bookTitle: '',
    progress: '',
    partialResult: null,
    result: null,
    error: null,
    errorType: null,
    startedAt: null,
    agentProgress: { ...IDLE_AGENT },
};

const listeners = new Set<StateListener>();

function setState(partial: Partial<AnalysisState>) {
    state = { ...state, ...partial };
    listeners.forEach(fn => fn(state));
}

/** Thread-safe helper: cập nhật 1 agent trong agentProgress mà không ghi đè agent khác */
function setAgentStatus(agent: keyof AgentProgress, status: AgentProgress[keyof AgentProgress]) {
    setState({ agentProgress: { ...state.agentProgress, [agent]: status } });
}

// ── Public API ───────────────────────────────────────────────
export const analysisManager = {
    subscribe(listener: StateListener): () => void {
        listeners.add(listener);
        listener(state);
        return () => listeners.delete(listener);
    },

    getState(): AnalysisState {
        return state;
    },

    isRunningFor(bookId: string): boolean {
        return state.status === 'processing' && state.bookId === bookId;
    },

    /**
     * Bắt đầu phân tích — 3 agent chạy SONG SONG (có key riêng).
     * Khi dùng shared key (proxy) → gọi 1 lần processBookFull để chỉ tốn 1 quota.
     */
    async startAnalysis(
        bookId: string,
        bookTitle: string,
        author: string,
        goal: string,
        onComplete: (bookId: string, result: any) => void,
        onError?: (bookId: string, error: string) => void
    ): Promise<void> {
        if (state.status === 'processing') {
            console.warn('[AnalysisManager] Already running for:', state.bookTitle);
            return;
        }

        // Accumulator — merge kết quả từng agent vào đây
        let partial: any = {};

        const mergePartial = (update: any) => {
            partial = { ...partial, ...update };
            setState({ partialResult: { ...partial } });
        };

        setState({
            status: 'processing',
            bookId,
            bookTitle,
            progress: 'Đang khởi động AI Agent...',
            partialResult: null,
            result: null,
            error: null,
            errorType: null,
            startedAt: Date.now(),
            agentProgress: { meta: 'running', knowledge: 'running', ideas: 'running' },
        });

        try {
            const hasPersonalKey = !!apiKeyManager.getKey();

            if (!hasPersonalKey) {
                // ── PROXY MODE: 1 lần gọi duy nhất = 1 quota/tháng ──────────
                console.log('📌 No personal key — using single processBookFull (proxy)');
                setState({ progress: 'Đang phân tích qua AI Proxy (1 lượt miễn phí)...' });

                const result = await geminiService.processBookFull(bookTitle, author, goal);

                // Map result vào progressive UI
                mergePartial({
                    bookMeta: result.bookMeta,
                    centralThesis: result.centralThesis,
                    criticalAnalysis: result.criticalAnalysis,
                    personalizedInsights: result.personalizedInsights,
                    executiveSummary: result.executiveSummary,
                    knowledgeArchitecture: result.knowledgeArchitecture,
                    ideaSystem: result.ideaSystem,
                });
                setState({
                    agentProgress: { meta: 'done', knowledge: 'done', ideas: 'done' },
                    progress: '✅ Phân tích hoàn tất!',
                    status: 'done',
                    result: partial,
                });
                onComplete(bookId, partial);
                return;
            }

            // ── PERSONAL KEY MODE: 3 agents song song (nhanh hơn) ──────

            setState({ progress: 'Đang khởi động 3 AI Agent song song...' });

            // Lưu lỗi từ mỗi agent để hiển thị cho user nếu tất cả đều fail
            const agentErrors: Error[] = [];

            // ── Agent 1: Meta (→ Layer 1 Overview) ──────────────────
            const p1 = geminiService.processMetaOnly(bookTitle, author, goal)
                .then(res => {
                    mergePartial({
                        bookMeta: res.bookMeta,
                        centralThesis: res.centralThesis,
                        criticalAnalysis: res.criticalAnalysis,
                        personalizedInsights: res.personalizedInsights,
                        executiveSummary: res.executiveSummary,
                    });
                    setAgentStatus('meta', 'done');
                    setState({ progress: '✅ Overview xong · Đang chờ Architecture & Ideas...' });
                    console.log('✅ Agent 1 (Meta) done');
                })
                .catch(err => {
                    console.error('❌ Agent 1 (Meta) failed:', err);
                    agentErrors.push(err);
                    setAgentStatus('meta', 'error');
                });

            // ── Agent 2: Knowledge Architecture (→ Layer 2) ─────────
            const p2 = geminiService.processKnowledgeOnly(bookTitle, author, goal)
                .then(res => {
                    mergePartial({ knowledgeArchitecture: res.knowledgeArchitecture });
                    setAgentStatus('knowledge', 'done');
                    setState({ progress: '✅ Architecture xong · Đang chờ Ideas...' });
                    console.log('✅ Agent 2 (Knowledge) done —', res.knowledgeArchitecture?.length, 'parts');
                })
                .catch(err => {
                    console.error('❌ Agent 2 (Knowledge) failed:', err);
                    agentErrors.push(err);
                    setAgentStatus('knowledge', 'error');
                });

            // ── Agent 3: Idea System (→ Layer 3) ────────────────────
            const p3 = geminiService.processIdeasOnly(bookTitle, author, goal)
                .then(res => {
                    mergePartial({ ideaSystem: res.ideaSystem });
                    setAgentStatus('ideas', 'done');
                    setState({ progress: '✅ Ideas xong!' });
                    console.log('✅ Agent 3 (Ideas) done —', res.ideaSystem?.length, 'ideas');
                })
                .catch(err => {
                    console.error('❌ Agent 3 (Ideas) failed:', err);
                    agentErrors.push(err);
                    setAgentStatus('ideas', 'error');
                });

            // Chờ tất cả 3 agent xong rồi finalize
            await Promise.allSettled([p1, p2, p3]);

            // Kiểm tra nếu TẤT CẢ agent đều lỗi → báo lỗi thay vì trả kết quả rỗng
            const allFailed = state.agentProgress.meta === 'error' &&
                state.agentProgress.knowledge === 'error' &&
                state.agentProgress.ideas === 'error';

            if (allFailed) {
                // Lấy lỗi đầu tiên từ agentErrors (đã được lưu trực tiếp)
                const firstError = agentErrors.length > 0
                    ? (agentErrors[0]?.message || String(agentErrors[0]))
                    : 'Tất cả AI Agent đều thất bại.';

                let errorType: AnalysisErrorType = 'general';
                if (firstError.includes('API_KEY_ERROR') || firstError.includes('expired') || firstError.includes('API_KEY_INVALID')) errorType = 'api_key';
                else if (firstError.includes('QUOTA_ERROR') || firstError.includes('FREE_QUOTA_EXHAUSTED')) errorType = 'quota';

                const userMessage = errorType === 'api_key'
                    ? 'API Key của bạn không hợp lệ hoặc đã hết hạn. Vui lòng vào Cài đặt để cập nhật Key mới.'
                    : errorType === 'quota'
                    ? 'Bạn đã hết lượt phân tích miễn phí tháng này. Nhập API Key cá nhân để tiếp tục.'
                    : firstError.replace('API_KEY_ERROR: ', '').replace('QUOTA_ERROR: ', '');

                setState({
                    status: 'error',
                    error: userMessage,
                    errorType,
                    progress: '',
                });
                onError?.(bookId, userMessage);
                return;
            }

            const finalResult = partial;
            setState({
                status: 'done',
                result: finalResult,
                progress: '✅ Phân tích hoàn tất!',
            });

            onComplete(bookId, finalResult);

        } catch (err: any) {
            console.error('❌ Analysis failed:', err);
            const errorMsg = err?.message || 'Lỗi không xác định';

            // Phân loại lỗi để UI hiển thị đúng thông báo
            let errorType: AnalysisErrorType = 'general';
            if (errorMsg.includes('API_KEY_ERROR')) errorType = 'api_key';
            else if (errorMsg.includes('QUOTA_ERROR') || errorMsg.includes('FREE_QUOTA_EXHAUSTED')) errorType = 'quota';

            // Lọc prefix kỹ thuật ra khỏi message hiển thị cho user
            const userMessage = errorMsg
                .replace('API_KEY_ERROR: ', '')
                .replace('QUOTA_ERROR: ', '');

            setState({
                status: 'error',
                error: userMessage,
                errorType,
                progress: '',
                agentProgress: { meta: 'error', knowledge: 'error', ideas: 'error' },
            });
            onError?.(bookId, userMessage);
        }
    },

    reset() {
        setState({
            status: 'idle',
            bookId: null,
            bookTitle: '',
            progress: '',
            partialResult: null,
            result: null,
            error: null,
            errorType: null,
            startedAt: null,
            agentProgress: { ...IDLE_AGENT },
        });
    },
};
