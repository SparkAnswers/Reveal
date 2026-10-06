import { ImageRef } from '../types';

/** True when the image is a GIF: by mime type, data:image/gif prefix, or a .gif URL. */
export function isGif(image?: ImageRef): boolean {
  if (!image) {
    return false;
  }
  if (image.mime && image.mime.toLowerCase() === 'image/gif') {
    return true;
  }
  const src = image.src ?? '';
  if (/^data:image\/gif[;,]/i.test(src)) {
    return true;
  }
  if (/^data:/i.test(src)) {
    return false;
  }
  const path = src.split(/[?#]/)[0];
  return /\.gif$/i.test(path);
}
