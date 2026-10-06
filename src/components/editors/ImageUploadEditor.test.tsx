import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StandardEditorProps } from '@grafana/data';
import { ImageUploadEditor } from './ImageUploadEditor';
import { DEFAULT_OPTIONS, ImageRef, MAX_BYTES, RevealOptions } from '../../types';

type Props = StandardEditorProps<ImageRef | undefined, {}, RevealOptions>;

function renderEditor(value?: ImageRef) {
  const onChange = jest.fn();
  const props = {
    value,
    onChange,
    context: { data: [], options: DEFAULT_OPTIONS },
    item: { id: 'image', name: 'Image' },
  } as unknown as Props;
  render(<ImageUploadEditor {...props} />);
  return onChange;
}

describe('ImageUploadEditor', () => {
  it('rejects GIFs that would exceed MAX_BYTES once base64-encoded', async () => {
    const onChange = renderEditor();
    const big = new File([new Uint8Array(MAX_BYTES)], 'huge.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByTestId('reveal-file-input'), { target: { files: [big] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types', async () => {
    const onChange = renderEditor();
    const pdf = new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('reveal-file-input'), { target: { files: [pdf] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unsupported/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stores a pasted URL as a url ref and clears stale metadata keys', () => {
    const onChange = renderEditor();
    const input = screen.getByLabelText('Image URL');
    fireEvent.change(input, { target: { value: 'https://example.com/a.png' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    const ref = onChange.mock.calls[0][0];
    expect(ref).toMatchObject({ kind: 'url', src: 'https://example.com/a.png' });
    expect(ref).toHaveProperty('bytes', undefined);
    expect(ref).toHaveProperty('name', undefined);
  });

  it('shows the file row and removes the image', () => {
    const onChange = renderEditor({
      kind: 'dataUrl',
      src: 'data:image/gif;base64,AAAA',
      mime: 'image/gif',
      name: 'surprise.gif',
      bytes: 2_200_000,
      width: 800,
      height: 500,
    });
    const row = screen.getByTestId('reveal-file-row');
    expect(row).toHaveTextContent('surprise.gif');
    expect(row).toHaveTextContent('GIF');
    expect(row).toHaveTextContent('2.1 MB · 800×500');

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
