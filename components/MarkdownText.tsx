import React from 'react';

/**
 * MarkdownText — Lightweight inline markdown renderer
 * Supports: **bold**, *italic*, bullet lists (- item), numbered lists (1. item)
 * No external dependencies needed.
 */

interface MarkdownTextProps {
  text: string;
  className?: string;
}

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  // Split by **bold** and *italic* patterns
  const parts: React.ReactNode[] = [];
  // Regex: **bold**, *italic* (but not ** inside **)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<br key={`br-${i}`} />);
      return;
    }

    // Bullet list: - item or * item (but not **bold**)
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkdown(bulletMatch[1])}</li>);
      return;
    }

    // Numbered list: 1. item, 2. item
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkdown(numberedMatch[1])}</li>);
      return;
    }

    // Regular paragraph
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
