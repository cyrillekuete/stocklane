'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n/use-t';

export function FieldError({ message, id }: { message?: string; id?: string }) {
  const t = useT();
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-normal text-destructive">
      {t(message)}
    </p>
  );
}

type NumberFieldProps = {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * Deferred number input: allows free typing (including clearing the field)
 * and only commits a numeric value on blur / Enter. Out-of-range and
 * non-numeric values are left to form-level validation (inline errors + save
 * guard) instead of clamping on every keystroke.
 */
export function NumberField({
  id,
  value,
  onCommit,
  min,
  max,
  step,
  disabled,
  placeholder,
  error,
  hint,
  className,
  ariaLabel,
}: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null);
  const focusedRef = useRef(false);
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId = hint && id && !error ? `${id}-hint` : undefined;

  useEffect(() => {
    if (!focusedRef.current && Number.isFinite(value)) {
      setText(null);
    }
  }, [value]);

  const display = text ?? (Number.isFinite(value) ? String(value) : '');

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onCommit(Number.NaN);
      return;
    }
    const parsed = Number(trimmed);
    onCommit(Number.isFinite(parsed) ? parsed : Number.NaN);
  };

  return (
    <div className="w-full space-y-1.5">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        className={className}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        value={display}
        onChange={(event) => setText(event.target.value)}
        onFocus={() => {
          focusedRef.current = true;
          setText((current) => current ?? (Number.isFinite(value) ? String(value) : ''));
        }}
        onBlur={(event) => {
          focusedRef.current = false;
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs font-normal text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldError message={error} id={errorId} />
    </div>
  );
}
