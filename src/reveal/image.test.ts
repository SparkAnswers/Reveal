import { isGif } from './image';

describe('isGif', () => {
  it('detects GIFs by mime, data URL prefix or extension', () => {
    expect(isGif(undefined)).toBe(false);
    expect(isGif({ kind: 'url', src: 'https://x/y.png' })).toBe(false);
    expect(isGif({ kind: 'url', src: 'https://x/y.gif' })).toBe(true);
    expect(isGif({ kind: 'url', src: 'https://x/y.GIF?x=1#frag' })).toBe(true);
    expect(isGif({ kind: 'url', src: 'https://x/y.png', mime: 'image/gif' })).toBe(true);
    expect(isGif({ kind: 'dataUrl', src: 'data:image/gif;base64,R0lGOD' })).toBe(true);
    expect(isGif({ kind: 'dataUrl', src: 'data:image/png;base64,iVBOR' })).toBe(false);
  });
});
