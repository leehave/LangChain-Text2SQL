import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface CodeHighlighterProps {
  code: string;
  language?: string;
  showCopyButton?: boolean;
}

function CodeHighlighter({
  code,
  language = 'sql',
  showCopyButton = true,
}: CodeHighlighterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      message.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error('Failed to copy');
    }
  };

  // Simple syntax highlighting for SQL
  const highlightSql = (sql: string): string => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN',
      'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER',
      'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS',
      'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 'BETWEEN',
      'LIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'CREATE',
      'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD', 'COLUMN',
      'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
      'VALUES', 'SET', 'INTO', 'WITH', 'RECURSIVE', 'RETURNING',
    ];

    const functions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF',
      'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING', 'REPLACE',
      'ROUND', 'FLOOR', 'CEIL', 'ABS', 'DATE', 'NOW', 'CURRENT_DATE',
      'CURRENT_TIMESTAMP', 'EXTRACT', 'CAST', 'CONVERT',
    ];

    let highlighted = sql
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight strings
    highlighted = highlighted.replace(
      /('[^']*')/g,
      '<span style="color: #0d7377;">$1</span>'
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span style="color: #d73a49;">$1</span>'
    );

    // Highlight keywords
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlighted = highlighted.replace(
        regex,
        '<span style="color: #d73a49; font-weight: 600;">$1</span>'
      );
    });

    // Highlight functions
    functions.forEach((func) => {
      const regex = new RegExp(`\\b(${func})\\s*(\\()`, 'gi');
      highlighted = highlighted.replace(
        regex,
        '<span style="color: #6f42c1;">$1</span>$2'
      );
    });

    // Highlight comments
    highlighted = highlighted.replace(
      /(--.*$)/gm,
      '<span style="color: #6a737d; font-style: italic;">$1</span>'
    );

    return highlighted;
  };

  const highlightedCode = language === 'sql' ? highlightSql(code) : code;

  return (
    <div
      style={{
        position: 'relative',
        background: '#f6f8fa',
        borderRadius: 8,
        border: '1px solid #e1e4e8',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#f1f3f4',
          borderBottom: '1px solid #e1e4e8',
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: '#586069',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {language}
        </span>
        {showCopyButton && (
          <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
            <Button
              type="text"
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              style={{ color: copied ? '#52c41a' : '#586069' }}
            />
          </Tooltip>
        )}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 16,
          overflow: 'auto',
          fontFamily:
            'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
          fontSize: 13,
          lineHeight: 1.5,
          background: '#f6f8fa',
        }}
      >
        <code
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
      </pre>
    </div>
  );
}

export default CodeHighlighter;
