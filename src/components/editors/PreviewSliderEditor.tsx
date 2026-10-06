import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, StandardEditorProps, dateTimeFormat } from '@grafana/data';
import { Button, Slider, useStyles2 } from '@grafana/ui';
import { RevealOptions } from '../../types';
import { computeProgress } from '../../reveal/progress';

type Props = StandardEditorProps<number | null | undefined, {}, RevealOptions>;

const MARKS = { 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' };

/** Editor-only scrubber. `null` means "follow the live clock". */
export const PreviewSliderEditor: React.FC<Props> = ({ value, onChange, context }) => {
  const styles = useStyles2(getStyles);
  const opts = context.options;
  // Snapshot the clock once per mount; the label only needs to be roughly current.
  const [now] = useState(() => Date.now());
  const live = computeProgress({ startDate: opts?.startDate, revealDate: opts?.revealDate, now });
  const isLive = value === null || value === undefined;
  const pct = isLive ? Math.round(live.raw * 100) : Math.round(value);

  let at = '';
  if (opts?.revealDate) {
    const end = new Date(opts.revealDate).getTime();
    const start = opts.startDate ? new Date(opts.startDate).getTime() : NaN;
    const ms = Number.isFinite(start) && start < end ? start + (end - start) * (pct / 100) : end;
    if (Number.isFinite(ms)) {
      at = dateTimeFormat(ms, { format: 'MMM D, YYYY' });
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span>{isLive ? 'Live' : 'Preview at'}</span>
        <b>
          {pct}%{at ? ` · ${at}` : ''}
        </b>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={pct}
        marks={MARKS}
        showInput={false}
        onChange={(v) => onChange(v)}
        ariaLabelForHandle="Preview progress"
      />
      <div className={styles.foot}>
        <span>Editor-only. Does not change what viewers see.</span>
        <Button size="sm" variant="secondary" fill="text" onClick={() => onChange(null)} disabled={isLive}>
          Live
        </Button>
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  wrap: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
  top: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    b: { color: theme.colors.text.primary, fontWeight: theme.typography.fontWeightMedium },
  }),
  foot: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.disabled,
  }),
});
