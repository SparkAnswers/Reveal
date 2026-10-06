import React from 'react';
import { render, screen } from '@testing-library/react';
import { PanelProps, dateTime } from '@grafana/data';
import { RevealPanel } from './RevealPanel';
import { DEFAULT_OPTIONS, ImageRef, RevealOptions } from '../types';
import type { ModeProps } from '../reveal/types';

const search: Record<string, unknown> = {};
jest.mock('@grafana/runtime', () => ({ locationService: { getSearchObject: () => search } }));

jest.mock('../reveal/modes', () => {
  const React = require('react');
  const FakeMode = (p: ModeProps) => React.createElement('img', { 'data-testid': 'mode', src: p.src, 'data-p': p.p });
  const def = { id: 'blur', name: 'Blur', description: '', gifSafe: true, Component: FakeMode };
  const instant = { ...def, id: 'instant', name: 'Instant' };
  return { MODES: [def, instant], getMode: (id: string) => (id === 'instant' ? instant : def) };
});

const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
const PNG: ImageRef = { kind: 'dataUrl', src: 'data:image/png;base64,AAAA', mime: 'image/png' };
const GIF: ImageRef = { kind: 'dataUrl', src: 'data:image/gif;base64,AAAA', mime: 'image/gif', name: 'a.gif' };

function renderPanel(overrides: Partial<RevealOptions>, onOptionsChange?: jest.Mock) {
  const options: RevealOptions = { ...DEFAULT_OPTIONS, image: PNG, ...overrides };
  const props = {
    options,
    onOptionsChange,
    width: 400,
    height: 300,
    timeRange: { from: dateTime(NOW - 3600_000), to: dateTime(NOW), raw: { from: 'now-1h', to: 'now' } },
  } as unknown as PanelProps<RevealOptions>;
  return render(<RevealPanel {...props} />);
}

const daysFromNow = (d: number) => new Date(NOW + d * 86_400_000).toISOString();

describe('RevealPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    delete search.editPanel;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the empty state when there is no image', () => {
    renderPanel({ image: undefined });
    expect(screen.getByText('Upload an image to get started')).toBeInTheDocument();
    expect(screen.queryByTestId('mode')).not.toBeInTheDocument();
  });

  it('renders the countdown footer with time remaining and percent', () => {
    renderPanel({ startDate: daysFromNow(-10), revealDate: daysFromNow(10) });
    const footer = screen.getByTestId('reveal-countdown');
    expect(footer).toHaveTextContent(/Reveals in/);
    expect(footer).toHaveTextContent('50% revealed');
    expect(screen.getByTestId('mode')).toHaveAttribute('data-p', String(0.25)); // easeIn: 0.5^2
  });

  it('asks for a reveal date when none is configured', () => {
    renderPanel({});
    expect(screen.getByTestId('reveal-countdown')).toHaveTextContent('Set a reveal date');
  });

  it('shows the caption and revealed footer at p = 1', () => {
    renderPanel({ startDate: daysFromNow(-20), revealDate: daysFromNow(-1), caption: 'Happy launch day!' });
    expect(screen.getByTestId('reveal-caption')).toHaveTextContent('Happy launch day!');
    expect(screen.getByTestId('reveal-countdown')).toHaveTextContent(/Revealed · Oct 4, 2026/);
    expect(screen.getByTestId('mode')).toHaveAttribute('data-p', '1');
  });

  it('hides the caption before the reveal', () => {
    renderPanel({ startDate: daysFromNow(-1), revealDate: daysFromNow(1), caption: 'Soon' });
    expect(screen.queryByTestId('reveal-caption')).not.toBeInTheDocument();
  });

  it('uses previewOverride instead of the live clock', () => {
    renderPanel({ startDate: daysFromNow(-20), revealDate: daysFromNow(-1), previewOverride: 50, easing: 'linear' });
    expect(screen.getByTestId('reveal-countdown')).toHaveTextContent('50% revealed');
    expect(screen.getByTestId('mode')).toHaveAttribute('data-p', '0.5');
  });

  it('hides the footer when showCountdown is off', () => {
    renderPanel({ revealDate: daysFromNow(1), showCountdown: false });
    expect(screen.queryByTestId('reveal-countdown')).not.toBeInTheDocument();
  });

  it('ticks every 30 s normally, every second in the last hour, and stops on unmount', () => {
    const setSpy = jest.spyOn(global, 'setInterval');
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderPanel({ revealDate: daysFromNow(2) });
    expect(setSpy).toHaveBeenLastCalledWith(expect.any(Function), 30_000);
    unmount();
    expect(clearSpy).toHaveBeenCalled();

    renderPanel({ revealDate: new Date(NOW + 10 * 60_000).toISOString() });
    expect(setSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it('does not tick once revealed or when the dashboard clock is used', () => {
    const setSpy = jest.spyOn(global, 'setInterval');
    renderPanel({ revealDate: daysFromNow(-1) });
    renderPanel({ revealDate: daysFromNow(1), timeSource: 'dashboard' });
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('does not crash when modeSettings is missing (fresh panel: Grafana only seeds non-null defaults)', () => {
    renderPanel({ revealDate: daysFromNow(1), modeSettings: undefined as unknown as RevealOptions['modeSettings'] });
    expect(screen.getByTestId('mode')).toBeInTheDocument();
  });

  it('does not tick when no reveal date is configured', () => {
    const setSpy = jest.spyOn(global, 'setInterval');
    renderPanel({});
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('never hands the live GIF to the mode before p = 1 when animateBeforeReveal is off', () => {
    // jsdom never fires Image.onload, which mirrors a slow network / a CORS-blocked GIF.
    renderPanel({ image: GIF, revealDate: daysFromNow(1) });
    const mode = screen.queryByTestId('mode');
    expect(mode === null || mode.getAttribute('src') !== GIF.src).toBe(true);
  });

  it('hands the live GIF to the mode when animateBeforeReveal is on, and once revealed', () => {
    renderPanel({ image: GIF, revealDate: daysFromNow(1), animateBeforeReveal: true });
    expect(screen.getByTestId('mode')).toHaveAttribute('src', GIF.src);
    renderPanel({ image: GIF, revealDate: daysFromNow(-1) });
    expect(screen.getAllByTestId('mode').pop()).toHaveAttribute('src', GIF.src);
  });

  it('sizes the image area to the height minus the footer', () => {
    renderPanel({ revealDate: daysFromNow(1) });
    const stage = screen.getByTestId('mode').parentElement as HTMLElement;
    expect(stage.style.height).toBe('272px');
  });

  it('shows the expired state after expireDate and hides image and caption', () => {
    renderPanel({ image: GIF, revealDate: daysFromNow(-2), expireDate: daysFromNow(-1), caption: 'Ta-da' });
    expect(screen.getByTestId('reveal-expired')).toBeInTheDocument();
    expect(screen.queryByTestId('mode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reveal-caption')).not.toBeInTheDocument();
    expect(screen.getByTestId('reveal-countdown')).toHaveTextContent(/Expired/);
  });

  it('keeps ticking after the reveal while an expiry is pending, and shows the time until it', () => {
    const spy = jest.spyOn(global, 'setInterval');
    renderPanel({ revealDate: daysFromNow(-1), expireDate: daysFromNow(1) });
    expect(screen.getByTestId('reveal-countdown')).toHaveTextContent(/expires in 1d 0h/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('stamps startDate to now when a reveal date is picked in the panel editor', () => {
    search.editPanel = '3';
    const onChange = jest.fn();
    renderPanel({ revealDate: daysFromNow(1) }, onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].startDate).toBe(new Date(NOW).toISOString());
  });

  it('does not stamp startDate outside the editor or when one is already set', () => {
    const onChange = jest.fn();
    renderPanel({ revealDate: daysFromNow(1) }, onChange);
    search.editPanel = '3';
    renderPanel({ revealDate: daysFromNow(1), startDate: daysFromNow(-1) }, onChange);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-stamps startDate when the reveal date is changed in the editor', () => {
    search.editPanel = '3';
    const onChange = jest.fn();
    const first: RevealOptions = {
      ...DEFAULT_OPTIONS,
      image: PNG,
      revealDate: daysFromNow(30),
      startDate: daysFromNow(-1),
    };
    const mk = (options: RevealOptions) =>
      ({
        options,
        onOptionsChange: onChange,
        width: 400,
        height: 300,
        timeRange: { from: dateTime(NOW - 3600_000), to: dateTime(NOW), raw: { from: 'now-1h', to: 'now' } },
      }) as unknown as PanelProps<RevealOptions>;
    const view = render(<RevealPanel {...mk(first)} />);
    expect(onChange).not.toHaveBeenCalled();
    view.rerender(<RevealPanel {...mk({ ...first, revealDate: daysFromNow(1) })} />);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].startDate).toBe(new Date(NOW).toISOString());
  });

  it('uses the step interval to quantise progress', () => {
    // 1-day window, 1 step per 6 h, 9 h elapsed -> eased p = 1/4
    renderPanel({
      easing: 'steps',
      modeSettings: { stepEvery: '6h' },
      startDate: new Date(NOW - 9 * 3600_000).toISOString(),
      revealDate: new Date(NOW + 15 * 3600_000).toISOString(),
    });
    expect(screen.getByTestId('mode').getAttribute('data-p')).toBe('0.25');
  });

  it('applies the background option to the image area', () => {
    const { container } = renderPanel({ revealDate: daysFromNow(1), background: '#123456' });
    const stage = container.querySelector('[data-testid="mode"]')!.parentElement!;
    expect(stage.style.background).toBe('rgb(18, 52, 86)');
  });

  it('instant mode is fully blank before the reveal: transparent background and no lock overlay', () => {
    const { container } = renderPanel({ mode: 'instant', revealDate: daysFromNow(1), background: '#123456' });
    const stage = container.querySelector('[data-testid="mode"]')!.parentElement!;
    expect(stage.style.background).toBe('transparent');
    expect(container.textContent).not.toContain('Not yet');
  });

  it('instant mode shows the background once revealed', () => {
    const { container } = renderPanel({ mode: 'instant', revealDate: daysFromNow(-1), background: '#123456' });
    const stage = container.querySelector('[data-testid="mode"]')!.parentElement!;
    expect(stage.style.background).toBe('rgb(18, 52, 86)');
  });

  describe('repeat schedule', () => {
    const EVEN = Date.UTC(2026, 9, 5, 12, 0, 10); // 10 s into an even minute
    const repeat = { enabled: true, every: '2m', showFor: '1m' };

    it('is blank between cycles and shows "Next in" in the footer', () => {
      jest.setSystemTime(EVEN);
      renderPanel({ repeat: { ...repeat, offset: '1m' } });
      expect(screen.getByTestId('reveal-hidden')).toBeInTheDocument();
      expect(screen.queryByTestId('mode')).not.toBeInTheDocument();
      const stage = screen.getByTestId('reveal-hidden').parentElement!;
      expect(stage.style.background).toBe('transparent');
      expect(screen.getByTestId('reveal-countdown')).toHaveTextContent('Next in 50s');
    });

    it('shows the image during the shown phase with time until it hides', () => {
      jest.setSystemTime(EVEN);
      renderPanel({ repeat, caption: 'Boo' });
      expect(screen.getByTestId('mode').getAttribute('data-p')).toBe('1');
      expect(screen.getByTestId('reveal-caption')).toBeInTheDocument();
      expect(screen.getByTestId('reveal-countdown')).toHaveTextContent(/Revealed · hides in 50s/);
    });

    it('keeps ticking every second while repeating, even when shown', () => {
      jest.setSystemTime(EVEN);
      const spy = jest.spyOn(global, 'setInterval');
      renderPanel({ repeat });
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);
      spy.mockRestore();
    });

    it('ignores the reveal date and never auto-stamps startDate while repeating', () => {
      search.editPanel = '3';
      const onChange = jest.fn();
      jest.setSystemTime(EVEN);
      renderPanel({ repeat, revealDate: daysFromNow(1) }, onChange);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('mode').getAttribute('data-p')).toBe('1');
    });
  });
});
