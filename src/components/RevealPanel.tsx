import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PanelProps, colorManipulator } from '@grafana/data';
import { Icon, useStyles2, useTheme2 } from '@grafana/ui';
import { RevealOptions } from '../types';
import { locationService } from '@grafana/runtime';
import {
  applyEasing,
  computeProgress,
  computeRepeat,
  deriveSeed,
  repeatActive,
  resolveSteps,
} from '../reveal/progress';
import { isGif } from '../reveal/image';
import { getMode } from '../reveal/modes';
import { Countdown, COUNTDOWN_HEIGHT } from './Countdown';
import { useStaticFrame } from './useStaticFrame';

const HOUR = 60 * 60 * 1000;
const EMPTY_SETTINGS: RevealOptions['modeSettings'] = {};

export const RevealPanel: React.FC<PanelProps<RevealOptions>> = ({
  options,
  width,
  height,
  timeRange,
  onOptionsChange,
}) => {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const { image, startDate, revealDate, expireDate, previewOverride, timeSource, repeat } = options;
  const configuredBackground = options.background
    ? theme.visualization.getColorByName(options.background)
    : theme.components.input.background;
  // Grafana only seeds defaults for non-null defaultValues, so a fresh panel has no modeSettings object.
  const modeSettings = options.modeSettings ?? EMPTY_SETTINGS;

  const [clock, setClock] = useState(() => Date.now());
  const now = timeSource === 'dashboard' ? timeRange.to.valueOf() : clock;

  const seed = useMemo(() => deriveSeed({ modeSettings, revealDate }), [modeSettings, revealDate]);
  const repeating = repeatActive(repeat);
  const progress = useMemo(
    () =>
      repeating
        ? computeRepeat({ repeat: repeat!, startDate, expireDate, now, seed })
        : computeProgress({ startDate, revealDate, expireDate, now }),
    [repeating, repeat, startDate, revealDate, expireDate, now, seed]
  );

  // Stamp the start date when a reveal date is picked or changed in the panel editor, so the window
  // runs from "now" rather than from a stale start or the 30-day fallback. Only while editing: view
  // mode must never dirty the dashboard. Changing the start date itself is always respected.
  const prevReveal = useRef(revealDate);
  useEffect(() => {
    const changed = prevReveal.current !== revealDate;
    prevReveal.current = revealDate;
    if (!image || !revealDate || !onOptionsChange || repeating || !isEditingPanel()) {
      return;
    }
    const reveal = Date.parse(revealDate);
    const start = startDate ? Date.parse(startDate) : NaN;
    const stale = !Number.isFinite(start) || start >= reveal;
    if (Number.isFinite(reveal) && (stale || changed)) {
      const stamp = Math.min(Date.now(), reveal - 1000);
      onOptionsChange({ ...options, startDate: new Date(stamp).toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, revealDate, startDate]);

  const overriding = previewOverride !== null && previewOverride !== undefined;
  const raw = overriding ? clamp01(previewOverride / 100) : progress.valid ? progress.raw : 0;
  const revealed = raw >= 1;
  const expired = progress.expired && !overriding;
  const expirePending = !!expireDate && !progress.expired && Number.isFinite(Date.parse(expireDate));
  const fast = repeating || progress.msRemaining < HOUR || (revealed && expirePending && progress.msUntilExpire < HOUR);

  // Live tick: 1 s in the last hour (always, for repeat schedules), otherwise 30 s. Not needed once
  // revealed for good, without a usable reveal date, or when dashboard time / the preview slider drives progress.
  const settled = (revealed && !expirePending && !repeating) || expired;
  useEffect(() => {
    if (settled || overriding || !progress.valid || timeSource === 'dashboard' || !image) {
      return;
    }
    const id = setInterval(() => setClock(Date.now()), fast ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [settled, overriding, progress.valid, timeSource, fast, image]);

  const p = applyEasing(raw, options.easing, resolveSteps(modeSettings, progress));
  const gif = isGif(image);
  const freeze = gif && !options.animateBeforeReveal && p < 1;
  // While frozen, `src` is a still PNG of the first frame, or undefined until it is captured (or if
  // it cannot be captured, e.g. a CORS-blocked GIF). The live GIF is never rendered in that state.
  const src = useStaticFrame(image?.src, freeze);

  if (!image?.src) {
    return (
      <div className={styles.wrapper} style={{ width, height }}>
        <div className={styles.empty} data-testid="reveal-empty">
          <div className={styles.emptyBox}>
            <Icon name="camera" size="lg" />
          </div>
          <div>Upload an image to get started</div>
        </div>
      </div>
    );
  }

  const mode = getMode(options.mode);
  const Mode = mode.Component;
  // Between repeat cycles (and before a scheduled start) the panel is completely blank.
  const hidden = !overriding && (progress.phase === 'hidden' || progress.phase === 'waiting');
  // Instant mode shows nothing at all until the reveal: no background block, no lock overlay.
  const blankUntilReveal = (mode.id === 'instant' && p < 1 && !expired) || hidden;
  const background = blankUntilReveal ? 'transparent' : configuredBackground;
  const stageHeight = Math.max(0, height - (options.showCountdown ? COUNTDOWN_HEIGHT : 0));
  const showCaption = p >= 1 && !!options.caption && !expired;

  return (
    <div className={styles.wrapper} style={{ width, height }}>
      <div className={styles.stage} style={{ height: stageHeight, background }}>
        {expired ? (
          <div className={styles.frozen} data-testid="reveal-expired">
            <Icon name="eye-slash" size="lg" />
            <span>This reveal has expired</span>
          </div>
        ) : hidden ? (
          <div data-testid="reveal-hidden" />
        ) : src ? (
          <Mode
            src={src}
            p={p}
            width={width}
            height={stageHeight}
            seed={seed}
            settings={modeSettings}
            isGif={gif && !freeze}
            days={progress.days}
          />
        ) : (
          <div className={styles.frozen} data-testid="reveal-frozen">
            GIF hidden until the reveal
          </div>
        )}
        {p <= 0.001 && !overriding && !expired && !blankUntilReveal && (
          <div className={styles.lock} aria-hidden>
            <Icon name="lock" size="lg" />
            <span>Not yet</span>
          </div>
        )}
        {showCaption && (
          <div className={styles.caption} data-testid="reveal-caption">
            {options.caption}
          </div>
        )}
      </div>
      {options.showCountdown && (
        <Countdown
          raw={raw}
          msRemaining={overriding ? (revealed ? 0 : progress.msRemaining) : progress.msRemaining}
          revealed={revealed}
          valid={progress.valid || overriding}
          revealDate={revealDate}
          expired={expired}
          expireDate={expireDate}
          msUntilExpire={overriding ? 0 : progress.msUntilExpire}
          phase={overriding ? undefined : progress.phase}
          msUntilHide={overriding ? 0 : progress.msUntilHide}
        />
      )}
    </div>
  );
};

/** True while the panel is open in the panel editor (Grafana adds ?editPanel=<id> to the URL). */
function isEditingPanel(): boolean {
  try {
    const q = locationService.getSearchObject();
    return q.editPanel !== undefined && q.editPanel !== null && q.editPanel !== '';
  } catch {
    return false;
  }
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }),
  stage: css({
    position: 'relative',
    flex: 'none',
    overflow: 'hidden',
    borderRadius: theme.shape.radius.default,
    background: theme.components.input.background,
  }),
  empty: css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  emptyBox: css({
    width: 44,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1.5px dashed ${theme.colors.border.strong}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.text.disabled,
  }),
  frozen: css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: theme.spacing(1),
    color: theme.colors.text.disabled,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  lock: css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.75),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    pointerEvents: 'none',
  }),
  caption: css({
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing(3.5, 1.5, 1.25),
    background: `linear-gradient(transparent, ${colorManipulator.alpha(theme.colors.background.canvas, 0.8)})`,
    color: theme.colors.text.maxContrast,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    textShadow: `0 1px 2px ${colorManipulator.alpha(theme.colors.background.canvas, 0.6)}`,
    pointerEvents: 'none',
  }),
});
