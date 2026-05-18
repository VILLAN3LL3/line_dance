import { describe, it, expect } from 'vitest';
import { hslToHex } from '../../utils/colorUtils.js';

describe('hslToHex', () => {
  it('converts pure red (0°, 100%, 50%) to #ff0000', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('converts pure green (120°, 100%, 50%) to #00ff00', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });

  it('converts pure blue (240°, 100%, 50%) to #0000ff', () => {
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('converts white (0°, 0%, 100%) to #ffffff', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('converts black (0°, 0%, 0%) to #000000', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts a mid-grey (0°, 0%, 50%) to #808080', () => {
    expect(hslToHex(0, 0, 50)).toBe('#808080');
  });

  it('returns a string starting with #', () => {
    expect(hslToHex(200, 60, 70)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('produces different hex values for different hues at the same saturation and lightness', () => {
    const a = hslToHex(30, 70, 50);
    const b = hslToHex(200, 70, 50);
    expect(a).not.toBe(b);
  });

  it('produces a very light color for high lightness', () => {
    const hex = hslToHex(210, 75, 95);
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    expect(Math.min(r, g, b)).toBeGreaterThan(200);
  });

  it('produces a dark color for low lightness', () => {
    const hex = hslToHex(210, 72, 25);
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    expect(Math.max(r, g, b)).toBeLessThan(130);
  });

  it('handles hue values at the 360° boundary the same as 0°', () => {
    expect(hslToHex(360, 100, 50)).toBe(hslToHex(0, 100, 50));
  });
});
