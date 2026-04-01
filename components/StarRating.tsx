import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { ratingService } from '../services/supabaseClient';

interface StarRatingProps {
    bookId: string;
    /** Hiển thị compact (inline) hay full (card) */
    compact?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ bookId, compact = false }) => {
    const [userRating, setUserRating] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [stats, setStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const [rating, bookStats] = await Promise.all([
                ratingService.getUserRating(bookId),
                ratingService.getBookRatingStats(bookId),
            ]);
            if (mounted) {
                setUserRating(rating);
                setStats(bookStats);
            }
        };
        load();
        return () => { mounted = false; };
    }, [bookId]);

    const handleRate = async (star: number) => {
        if (saving) return;
        setSaving(true);
        const newRating = userRating === star ? null : star; // toggle off nếu bấm lại
        setUserRating(newRating);
        try {
            if (newRating !== null) {
                await ratingService.saveRating(bookId, newRating);
            }
            // Refresh stats
            const newStats = await ratingService.getBookRatingStats(bookId);
            setStats(newStats);
        } finally {
            setSaving(false);
        }
    };

    const displayRating = hovered ?? userRating ?? 0;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => setHovered(star)}
                            onMouseLeave={() => setHovered(null)}
                            disabled={saving}
                            className="transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
                            title={`Đánh giá ${star} sao`}
                        >
                            <Star
                                size={16}
                                className={`transition-colors ${star <= displayRating
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-600 fill-transparent'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
                {stats.count > 0 && (
                    <span className="text-[10px] text-slate-500 font-medium">
                        {stats.avg} <span className="opacity-50">({stats.count})</span>
                    </span>
                )}
                {userRating && (
                    <span className="text-[9px] text-amber-400/60 font-medium">Của bạn</span>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[#212226] border border-[#2F3034] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wide">Đánh giá cuốn sách</h4>
                {stats.count > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-400">
                        <Star size={13} className="fill-amber-400" />
                        <span className="text-[12px] font-bold">{stats.avg}</span>
                        <span className="text-slate-600 text-[10px]">({stats.count} đánh giá)</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(null)}
                        disabled={saving}
                        className="transition-all hover:scale-125 active:scale-95 disabled:cursor-not-allowed"
                        title={['', 'Tệ', 'Không hay', 'Bình thường', 'Hay', 'Xuất sắc'][star]}
                    >
                        <Star
                            size={28}
                            className={`transition-all duration-150 ${star <= displayRating
                                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                                    : 'text-slate-700 fill-transparent hover:text-amber-600'
                                }`}
                        />
                    </button>
                ))}
            </div>

            <div className="h-5 text-center">
                {hovered && (
                    <p className="text-[11px] text-amber-400 font-medium animate-in fade-in duration-100">
                        {['', '😞 Tệ', '😐 Không hay', '🙂 Bình thường', '😊 Hay', '🤩 Xuất sắc'][hovered]}
                    </p>
                )}
                {!hovered && userRating && (
                    <p className="text-[10px] text-slate-600">
                        Bạn đã đánh giá: {userRating} sao · Bấm lại để thay đổi
                    </p>
                )}
                {!hovered && !userRating && (
                    <p className="text-[10px] text-slate-700">Bấm để đánh giá</p>
                )}
            </div>
        </div>
    );
};

export default StarRating;
