import { describe, expect, it } from 'vitest';
import {
  firstFontFamily,
  hue,
  luminance,
  normalizeFontWeight,
  parseCssColor,
  saturation,
  toHex,
} from './analyze-helpers';

describe('parseCssColor / toHex', () => {
  it('parses rgb() and rgba() computed values', () => {
    expect(parseCssColor('rgb(108, 92, 231)')).toEqual({ r: 108, g: 92, b: 231, a: 1 });
    expect(parseCssColor('rgba(0, 0, 0, 0.5)')?.a).toBe(0.5);
    expect(toHex(parseCssColor('rgb(108, 92, 231)')!)).toBe('#6C5CE7');
  });

  it('parses hex values including shorthand', () => {
    expect(toHex(parseCssColor('#6c5ce7')!)).toBe('#6C5CE7');
    expect(toHex(parseCssColor('#fff')!)).toBe('#FFFFFF');
  });

  it('treats transparent as zero alpha and rejects garbage', () => {
    expect(parseCssColor('transparent')?.a).toBe(0);
    expect(parseCssColor('inherit')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});

describe('color metrics', () => {
  it('classifies light vs dark via luminance', () => {
    expect(luminance(parseCssColor('#FFFFFF')!)).toBeGreaterThan(0.9);
    expect(luminance(parseCssColor('#111111')!)).toBeLessThan(0.1);
  });

  it('measures saturation and hue', () => {
    expect(saturation(parseCssColor('#888888')!)).toBe(0);
    expect(saturation(parseCssColor('#2563EB')!)).toBeGreaterThan(0.5);
    expect(hue(parseCssColor('#FF0000')!)).toBe(0);
    expect(Math.round(hue(parseCssColor('#00FF00')!))).toBe(120);
  });
});

describe('font helpers', () => {
  it('normalizes weights', () => {
    expect(normalizeFontWeight('bold')).toBe(700);
    expect(normalizeFontWeight('normal')).toBe(400);
    expect(normalizeFontWeight('550')).toBe(550);
  });

  it('extracts the first family without quotes', () => {
    expect(firstFontFamily('"Segoe UI", Roboto, sans-serif')).toBe('Segoe UI');
    expect(firstFontFamily('Inter, sans-serif')).toBe('Inter');
  });
});
