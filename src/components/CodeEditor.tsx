import React, { useMemo, useRef } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (next: string) => void;
  activeLine: number;
  errorLine?: number;
  disabled?: boolean;
  onRunShortcut: () => void;
}

const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'break',
  'continue',
  'def',
  'elif',
  'else',
  'for',
  'if',
  'in',
  'not',
  'or',
  'pass',
  'return',
  'while',
]);

const PY_BUILTINS = new Set([
  'move',
  'turn_left',
  'turn_right',
  'collect',
  'wait',
  'wall_ahead',
  'wall_left',
  'wall_right',
  'hazard_ahead',
  'gem_here',
  'switch_here',
  'at_goal',
  'energy_left',
  'print',
  'range',
  'len',
  'abs',
  'min',
  'max',
  'int',
  'str',
  'bool',
]);

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < line.length) {
    const ch = line[i];

    // Comment
    if (ch === '#') {
      tokens.push(
        <span key={k++} className="text-slate-500 italic">
          {line.slice(i)}
        </span>
      );
      break;
    }

    // String
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === q) {
          j++;
          break;
        }
        j++;
      }
      tokens.push(
        <span key={k++} className="text-emerald-300">
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push(
        <span key={k++} className="text-amber-300">
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Identifier / keyword / builtin
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (PY_KEYWORDS.has(word)) {
        tokens.push(
          <span key={k++} className="text-amber-400 font-medium">
            {word}
          </span>
        );
      } else if (PY_BUILTINS.has(word)) {
        tokens.push(
          <span key={k++} className="text-sky-300">
            {word}
          </span>
        );
      } else {
        tokens.push(
          <span key={k++} className="text-slate-100">
            {word}
          </span>
        );
      }
      i = j;
      continue;
    }

    // Plain character / operator
    let j = i + 1;
    while (
      j < line.length &&
      !/[#'"0-9A-Za-z_]/.test(line[j])
    ) {
      j++;
    }
    tokens.push(
      <span key={k++} className="text-slate-400">
        {line.slice(i, j)}
      </span>
    );
    i = j;
  }

  return tokens.length > 0 ? tokens : [<span key="empty">&nbsp;</span>];
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  activeLine,
  errorLine,
  disabled,
  onRunShortcut,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => code.split('\n'), [code]);

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunShortcut();
      return;
    }

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Outdent current line
        const lineStart = code.lastIndexOf('\n', start - 1) + 1;
        const slice = code.slice(lineStart);
        let removed = 0;
        if (slice.startsWith('    ')) removed = 4;
        else if (slice.startsWith('\t')) removed = 1;
        else {
          while (removed < 4 && slice[removed] === ' ') removed++;
        }
        if (removed > 0) {
          const next = code.slice(0, lineStart) + code.slice(lineStart + removed);
          onChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = Math.max(lineStart, start - removed);
            ta.selectionEnd = Math.max(lineStart, end - removed);
          });
        }
      } else {
        const next = code.slice(0, start) + '    ' + code.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLine = code.slice(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';
      if (currentLine.trimEnd().endsWith(':')) {
        indent += '    ';
      }
      const insert = '\n' + indent;
      const next = code.slice(0, start) + insert + code.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + insert.length;
      });
    }
  };

  return (
    <div className="relative flex flex-1 min-h-0 bg-[#0D1420] border border-slate-800 rounded-lg overflow-hidden">
      {/* Line Number Gutter */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="w-11 shrink-0 py-3 bg-[#0A101A] border-r border-slate-800/80 select-none overflow-hidden text-right font-mono text-[13px] leading-[22px] tabular-nums"
      >
        {lines.map((_, idx) => {
          const ln = idx + 1;
          const isActive = activeLine === ln;
          const isErr = errorLine === ln;
          return (
            <div
              key={ln}
              className={`px-2.5 transition-colors ${
                isErr
                  ? 'bg-red-500/20 text-red-400 font-semibold'
                  : isActive
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-600'
              }`}
            >
              {ln}
            </div>
          );
        })}
      </div>

      {/* Synchronized Highlight Layer + Transparent Textarea */}
      <div className="relative flex-1 min-w-0 min-h-0">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 py-3 px-3.5 font-mono text-[13.5px] leading-[22px] whitespace-pre overflow-hidden pointer-events-none"
        >
          {lines.map((line, idx) => {
            const ln = idx + 1;
            const isActive = activeLine === ln;
            const isErr = errorLine === ln;
            return (
              <div
                key={ln}
                className={`min-h-[22px] -mx-3.5 px-3.5 ${
                  isErr
                    ? 'bg-red-500/15'
                    : isActive
                    ? 'bg-amber-500/12'
                    : ''
                }`}
              >
                {highlightLine(line)}
              </div>
            );
          })}
        </pre>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Python code editor"
          className="code-input relative z-10 w-full h-full py-3 px-3.5 bg-transparent text-transparent caret-amber-400 font-mono text-[13.5px] leading-[22px] resize-none focus:outline-none whitespace-pre overflow-auto pytrail-scroll disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};
