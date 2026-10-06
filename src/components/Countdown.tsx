import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, dateTimeFormat } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';
import { formatDuration, formatRemaining } from '../reveal/progress';

/** Footer height in px (22px row + 6px gap), used by the panel to size the image area. */
export const COUNTDOWN_HEIGHT = 28;

export interface CountdownProps {
  /** Raw (un-eased) progress 0..1. */
  raw: number;
  msRemaining: number;
  revealed: boolean;
  /** False when no usable reveal date is configured. */
  valid: boolean;
  revealDate?: string;
  expired?: boolean;
  expireDate?: string;
  /** Milliseconds until expiry; 0 when none is set. */
  msUntilExpire?: number;
  /** Repeat schedules: current phase. */
  phase?: 'waiting' | 'revealing' | 'shown' | 'hidden';
  /** Repeat schedules: ms until the shown phase ends. */
  msUntilHide?: number;
}

export const Countdown: React.FC<CountdownProps> = ({
  raw,
  msRemaining,
  revealed,
  valid,
  revealDate,
  expired,
  expireDate,
  msUntilExpire = 0,
  phase,
  msUntilHide = 0,
}) => {
  const styles = useStyles2(getStyles);
  const pct = Math.round(Math.min(1, Math.max(0, raw)) * 100);
  const repeating = phase !== undefined;

  if (expired) {
    const when = expireDate ? dateTimeFormat(expireDate, { format: 'MMM D, YYYY HH:mm' }) : '';
    return (
      <div className={styles.footer} data-testid="reveal-countdown">
        <Icon name="eye-slash" size="sm" />
        <span>Expired{when ? ` · ${when}` : ''}</span>
        <span className={styles.rail} />
        <span />
      </div>
    );
  }

  if (repeating && (phase === 'hidden' || phase === 'waiting')) {
    const next = Number.isFinite(msRemaining) ? `Next in ${formatDuration(msRemaining)}` : 'Waiting';
    return (
      <div className={styles.footer} data-testid="reveal-countdown">
        <Icon name="clock-nine" size="sm" />
        <span>{next}</span>
        <span className={styles.rail} />
        <span />
      </div>
    );
  }

  if (revealed && valid) {
    const when = !repeating && revealDate ? dateTimeFormat(revealDate, { format: 'MMM D, YYYY' }) : '';
    const hide = repeating && msUntilHide > 0 ? ` · hides in ${formatDuration(msUntilHide)}` : '';
    const expiry = msUntilExpire > 0 ? ` · expires in ${formatDuration(msUntilExpire)}` : '';
    return (
      <div className={`${styles.footer} ${styles.done}`} data-testid="reveal-countdown">
        <Icon name="check" size="sm" />
        <span>
          Revealed{when ? ` · ${when}` : ''}
          {hide}
          {expiry}
        </span>
        <span className={styles.rail}>
          <i className={styles.fill} style={{ width: '100%' }} />
        </span>
        <span>100%</span>
      </div>
    );
  }

  return (
    <div className={styles.footer} data-testid="reveal-countdown">
      <Icon name="clock-nine" size="sm" />
      <span>{valid ? `Reveals in ${formatRemaining(msRemaining)}` : 'Set a reveal date to start the countdown'}</span>
      <span className={styles.rail}>
        <i className={styles.fill} style={{ width: `${pct}%` }} />
      </span>
      <span>{pct}% revealed</span>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  footer: css({
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    height: 22,
    marginTop: 6,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }),
  done: css({
    color: theme.colors.success.text,
    i: { background: theme.colors.success.text },
  }),
  rail: css({
    flex: 1,
    height: 3,
    minWidth: 30,
    borderRadius: theme.shape.radius.default,
    background: theme.colors.border.medium,
    overflow: 'hidden',
  }),
  fill: css({
    display: 'block',
    height: '100%',
    borderRadius: theme.shape.radius.default,
    background: theme.colors.primary.main,
    transition: 'width .2s',
  }),
});
