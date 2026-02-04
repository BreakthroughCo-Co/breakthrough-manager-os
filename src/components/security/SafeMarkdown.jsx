import React from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import rehypeSanitize from 'rehype-sanitize';

/**
 * SafeMarkdown - XSS-safe markdown renderer for AI-generated content
 * 
 * Critical for NDIS compliance and audit readiness:
 * - Sanitizes all HTML/markdown before rendering
 * - Prevents XSS attacks from AI-generated responses
 * - Maintains content integrity for regulatory review
 */
export default function SafeMarkdown({ content, className = '', components = {} }) {
  // Double sanitization: DOMPurify + rehype-sanitize for defense in depth
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });

  const defaultComponents = {
    a: ({ href, children, ...props }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-teal-600 hover:text-teal-700 underline"
        {...props}
      >
        {children}
      </a>
    ),
    ...components
  };

  return (
    <div className={className}>
      <ReactMarkdown
        components={defaultComponents}
        rehypePlugins={[rehypeSanitize]}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}