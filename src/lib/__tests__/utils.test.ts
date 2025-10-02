import { cn } from '../utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should override conflicting tailwind classes', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', { 'conditional-class': true })).toBe('base conditional-class');
    expect(cn('base', { 'conditional-class': false })).toBe('base');
  });

  it('should handle mixed arguments', () => {
    expect(cn('p-4', null, undefined, 'm-2', { 'font-bold': true })).toBe('p-4 m-2 font-bold');
  });

  it('should remove duplicate class names', () => {
    expect(cn('p-4', 'p-4')).toBe('p-4');
  });

  it('should handle complex tailwindcss classes', () => {
    expect(cn('px-2 py-1 bg-red-500', 'p-3 bg-blue-500')).toBe('p-3 bg-blue-500');
  });
});