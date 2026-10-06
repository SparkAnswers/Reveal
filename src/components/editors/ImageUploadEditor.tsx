import React, { useCallback, useRef, useState } from 'react';
import { css, cx } from '@emotion/css';
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { Icon, IconButton, Input, useStyles2 } from '@grafana/ui';
import { ImageRef, MAX_BYTES, RevealOptions, WARN_BYTES } from '../../types';
import { isGif } from '../../reveal/image';

type Props = StandardEditorProps<ImageRef | undefined, {}, RevealOptions>;

export const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
/** Raw files above this are not even read; nothing sensible survives downscaling from here. */
const MAX_RAW_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1600;
const MIN_EDGE = 320;
const WEBP_QUALITY = 0.85;

/** Everything an ImageRef can hold. Panel option objects are merged on change, so stale keys must be cleared explicitly. */
const EMPTY_REF: Required<ImageRef> = { kind: 'url', src: '', mime: '', width: 0, height: 0, bytes: 0, name: '' };

export const ImageUploadEditor: React.FC<Props> = ({ value, onChange }) => {
  const styles = useStyles2(getStyles);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState('');

  const commit = useCallback(
    (ref: ImageRef | undefined) => {
      if (!ref) {
        onChange(undefined);
        return;
      }
      // Spread over an "all keys undefined" shape so switching upload <-> URL clears old metadata.
      const cleared = Object.fromEntries(Object.keys(EMPTY_REF).map((k) => [k, undefined]));
      onChange({ ...cleared, ...ref } as ImageRef);
    },
    [onChange]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setNotice(null);
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError('Unsupported file type. Use PNG, JPG, WebP or GIF.');
        return;
      }
      const gif = file.type === 'image/gif';
      const estimated = Math.ceil(file.size / 3) * 4;
      if ((gif && estimated > MAX_BYTES) || file.size > MAX_RAW_BYTES) {
        setError(
          `${file.name} is too large (${formatBytes(estimated)} encoded). The limit is ${formatBytes(MAX_BYTES)}.`
        );
        return;
      }

      setBusy(true);
      try {
        const result = await prepareImage(file);
        if (result.bytes > MAX_BYTES) {
          setError(
            `${file.name} is still ${formatBytes(result.bytes)} after downscaling. The limit is ${formatBytes(MAX_BYTES)}.`
          );
          return;
        }
        if (result.bytes > WARN_BYTES) {
          setNotice(`Large image (${formatBytes(result.bytes)}). It is stored in the dashboard JSON.`);
        } else if (result.downscaled) {
          setNotice(`Downscaled to ${result.width}×${result.height} (${formatBytes(result.bytes)}).`);
        }
        commit({
          kind: 'dataUrl',
          src: result.src,
          mime: result.mime,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          name: file.name,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not read the file.');
      } finally {
        setBusy(false);
      }
    },
    [commit]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    if (!/^(https?:)?\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
      setError('Enter an absolute http(s) URL.');
      return;
    }
    setError(null);
    setNotice(null);
    commit({ kind: 'url', src: trimmed });
    setUrl('');
  };

  return (
    <div className={styles.wrap}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        className={cx(styles.dropzone, dragging && styles.dropzoneActive)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Icon name="upload" size="lg" />
        <div>
          <b>Drop an image or GIF here</b> or click to browse
        </div>
        <div className={styles.hint}>
          PNG, JPG, WebP, GIF &middot; up to {formatBytes(MAX_BYTES)} &middot; stored with the dashboard JSON
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          className={styles.hiddenInput}
          data-testid="reveal-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      {busy && <div className={styles.hint}>Processing image…</div>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {notice && !error && <div className={styles.hint}>{notice}</div>}

      {value?.src && (
        <div className={styles.file} data-testid="reveal-file-row">
          <span className={styles.thumb}>
            <img src={value.src} alt="" />
          </span>
          <span className={styles.name} title={value.name ?? value.src}>
            {value.name ?? displayUrl(value.src)}
          </span>
          {isGif(value) && <span className={styles.tag}>GIF</span>}
          <span className={styles.meta}>
            {[
              value.bytes ? formatBytes(value.bytes) : null,
              value.width && value.height ? `${value.width}×${value.height}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <IconButton name="times" tooltip="Remove image" aria-label="Remove image" onClick={() => commit(undefined)} />
        </div>
      )}

      <Input
        value={url}
        placeholder="or paste an image URL"
        aria-label="Image URL"
        onChange={(e) => setUrl(e.currentTarget.value)}
        onBlur={submitUrl}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submitUrl();
          }
        }}
      />
    </div>
  );
};

interface Prepared {
  src: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  downscaled: boolean;
}

/** Reads the file as a data URL; non-GIF images above WARN_BYTES are re-encoded to WebP and shrunk until they fit. */
async function prepareImage(file: File): Promise<Prepared> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original).catch(() => null);
  const width = img?.naturalWidth ?? 0;
  const height = img?.naturalHeight ?? 0;
  let best: Prepared = { src: original, mime: file.type, width, height, bytes: original.length, downscaled: false };

  if (file.type === 'image/gif' || best.bytes <= WARN_BYTES || !img) {
    return best;
  }

  let edge = Math.min(MAX_EDGE, Math.max(width, height));
  while (edge >= MIN_EDGE) {
    const scaled = downscale(img, edge);
    if (!scaled) {
      break;
    }
    if (scaled.bytes < best.bytes) {
      best = scaled;
    }
    if (best.bytes <= WARN_BYTES) {
      break;
    }
    edge = Math.floor(edge * 0.75);
  }
  return best;
}

function downscale(img: HTMLImageElement, maxEdge: number): Prepared | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.drawImage(img, 0, 0, w, h);
  let src = canvas.toDataURL('image/webp', WEBP_QUALITY);
  let mime = 'image/webp';
  if (!src.startsWith('data:image/webp')) {
    // Browser without WebP encoding support falls back to JPEG.
    src = canvas.toDataURL('image/jpeg', WEBP_QUALITY);
    mime = 'image/jpeg';
  }
  return { src, mime, width: w, height: h, bytes: src.length, downscaled: true };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('no Image'));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the image.'));
    img.src = src;
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${Math.round(n / 1024)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function displayUrl(src: string): string {
  try {
    const u = new URL(src, 'http://localhost');
    return u.pathname.split('/').pop() || u.hostname;
  } catch {
    return src;
  }
}

const getStyles = (theme: GrafanaTheme2) => ({
  wrap: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
  dropzone: css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    padding: theme.spacing(2, 1.5),
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    border: `1px dashed ${theme.colors.border.strong}`,
    borderRadius: theme.shape.radius.default,
    background: theme.colors.background.secondary,
    transition: 'border-color .15s, background .15s',
    b: { color: theme.colors.text.primary, fontWeight: theme.typography.fontWeightMedium },
    '&:hover, &:focus-visible': { borderColor: theme.colors.primary.border },
  }),
  dropzoneActive: css({
    borderColor: theme.colors.primary.border,
    background: theme.colors.primary.transparent,
  }),
  hiddenInput: css({ display: 'none' }),
  hint: css({ fontSize: theme.typography.bodySmall.fontSize, color: theme.colors.text.disabled }),
  error: css({ fontSize: theme.typography.bodySmall.fontSize, color: theme.colors.error.text }),
  file: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    fontSize: theme.typography.bodySmall.fontSize,
    background: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
  }),
  thumb: css({
    width: 28,
    height: 20,
    flex: 'none',
    overflow: 'hidden',
    borderRadius: theme.shape.radius.default,
    background: theme.components.input.background,
    img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  }),
  name: css({
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.colors.text.primary,
  }),
  tag: css({
    flex: 'none',
    padding: '0 4px',
    fontSize: 10,
    fontWeight: theme.typography.fontWeightBold,
    letterSpacing: '.5px',
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.text.secondary,
  }),
  meta: css({ flex: 'none', color: theme.colors.text.disabled, whiteSpace: 'nowrap' }),
});
