import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Input, Stack } from '@grafana/ui';
import { RevealOptions } from '../../types';

type Props = StandardEditorProps<string | undefined, {}, RevealOptions>;

/** ISO string -> value for <input type="datetime-local"> in the browser's local time zone. */
export function toLocalInput(iso?: string): string {
  if (!iso) {
    return '';
  }
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}

/** datetime-local value (local time) -> ISO string, or undefined when empty/invalid. */
export function fromLocalInput(v: string): string | undefined {
  if (!v) {
    return undefined;
  }
  const t = new Date(v);
  return Number.isFinite(t.getTime()) ? t.toISOString() : undefined;
}

/**
 * Date + time editor backed by the native datetime-local input, so typing a time commits on every
 * change (no calendar click needed). Stores an ISO-8601 string.
 */
export const DateTimeEditor: React.FC<Props> = ({ value, onChange }) => {
  // datetime-local only emits change events for complete values (or empty), so it can be fully controlled.
  const commit = (v: string) => {
    const iso = fromLocalInput(v);
    if (iso !== undefined || v === '') {
      onChange(iso);
    }
  };

  return (
    <Stack direction="row" gap={0.5}>
      <Input
        type="datetime-local"
        step={1}
        value={toLocalInput(value)}
        onChange={(e) => commit(e.currentTarget.value)}
        aria-label="Date and time"
      />
      <Button variant="secondary" size="md" onClick={() => onChange(new Date().toISOString())} tooltip="Set to now">
        Now
      </Button>
      <Button
        variant="secondary"
        size="md"
        icon="times"
        onClick={() => onChange(undefined)}
        tooltip="Clear"
        aria-label="Clear"
      />
    </Stack>
  );
};
