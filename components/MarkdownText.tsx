import React from 'react';

/**
 * MarkdownText — Bộ render markdown gọn, không cần thư viện ngoài.
 * Hỗ trợ: **đậm**, *nghiêng*, tiêu đề (# hoặc cả dòng in đậm),
 * gạch đầu dòng (-, •, *) và danh sách đánh số (1. …).
 *
 * Dấu `*` PHẢI nằm trong danh sách ký tự gạch đầu dòng: AI hay viết `* mục`,
 * và nếu không bắt ở mức dòng thì bộ dò *nghiêng* sẽ ăn nhầm dấu sao đó,
 * làm vỡ cả đoạn (chữ nghiêng lạc chỗ + dấu sao thừa lửng lơ).
 */

interface MarkdownTextProps {
  text: string;
  className?: string;
}

// Màu nhấn cho chữ in đậm — tách khỏi màu chữ thân bài để mắt bắt được cấu trúc
const HEADING_CLASS = 'block text-blue-400 font-semibold mt-4 mb-1 not-italic opacity-100';
const BOLD_CLASS = 'font-semibold text-blue-300 not-italic';

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  // **đậm** hoặc *nghiêng*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={match.index} className={BOLD_CLASS}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/** Trả về nội dung tiêu đề nếu dòng là tiêu đề, ngược lại trả null. */
const parseHeading = (line: string): string | null => {
  const hashHeading = line.match(/^#{1,6}\s+(.+)$/);
  if (hashHeading) return hashHeading[1].replace(/\*/g, '').trim();

  // Cả dòng in đậm ("**1. Xếp chồng (The Stack):**") cũng là tiêu đề
  const boldLine = line.match(/^\*\*(.+)\*\*:?$/);
  if (boldLine && !boldLine[1].includes('**')) return boldLine[1].trim();

  return null;
};

const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1`}>
          {listItems}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Dòng trống
    if (!trimmed) {
      flushList();
      elements.push(<br key={`br-${i}`} />);
      return;
    }

    // Tiêu đề
    const heading = parseHeading(trimmed);
    if (heading) {
      flushList();
      elements.push(
        <strong key={`h-${i}`} className={HEADING_CLASS}>{heading}</strong>
      );
      return;
    }

    // Gạch đầu dòng: - mục / • mục / * mục (khoảng trắng phía sau tách khỏi **đậm**)
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkdown(bulletMatch[1])}</li>);
      return;
    }

    // Danh sách đánh số: 1. mục, 2) mục
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkdown(numberedMatch[1])}</li>);
      return;
    }

    // Đoạn văn thường
    flushList();
    elements.push(
      <span key={`p-${i}`}>
        {renderInlineMarkdown(trimmed)}
        {i < lines.length - 1 ? '\n' : ''}
      </span>
    );
  });

  flushList();

  return <div className={`whitespace-pre-line ${className}`}>{elements}</div>;
};

export default MarkdownText;
