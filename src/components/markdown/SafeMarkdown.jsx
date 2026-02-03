import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

/**
 * SafeMarkdown - A secure markdown renderer that sanitizes HTML
 * 
 * This component wraps react-markdown with rehype-sanitize to prevent XSS attacks
 * by removing potentially dangerous HTML elements and attributes.
 * 
 * @param {Object} props - Component props
 * @param {string} props.children - Markdown content to render
 * @param {string} props.className - Optional CSS classes
 * @param {Object} props.components - Optional custom component overrides
 */
export default function SafeMarkdown({ children, className, components, ...props }) {
  return (
    <ReactMarkdown
      className={className}
      rehypePlugins={[rehypeSanitize]}
      components={components}
      {...props}
    >
      {children}
    </ReactMarkdown>
  );
}