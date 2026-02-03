/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { describe, it, expect } from 'vitest';
import { QuotaDisplay } from './QuotaDisplay.js';
import stripAnsi from 'strip-ansi';

describe('QuotaDisplay', () => {
  it('should not render when remaining is undefined', () => {
    const { lastFrame } = render(
      <QuotaDisplay remaining={undefined} limit={100} />,
    );
    expect(lastFrame()).toBe('');
  });

  it('should not render when limit is undefined', () => {
    const { lastFrame } = render(
      <QuotaDisplay remaining={100} limit={undefined} />,
    );
    expect(lastFrame()).toBe('');
  });

  it('should not render when limit is 0', () => {
    const { lastFrame } = render(<QuotaDisplay remaining={100} limit={0} />);
    expect(lastFrame()).toBe('');
  });

  it('should render green when quota > 20%', () => {
    const { lastFrame } = render(<QuotaDisplay remaining={85} limit={100} />);
    const frame = lastFrame();
    expect(stripAnsi(frame!)).toBe('[Quota: 85.0%]');
  });

  it('should render yellow when quota < 20%', () => {
    const { lastFrame } = render(<QuotaDisplay remaining={15} limit={100} />);
    const frame = lastFrame();
    expect(stripAnsi(frame!)).toBe('[Quota: 15.0%]');
  });

  it('should render red when quota < 5%', () => {
    const { lastFrame } = render(<QuotaDisplay remaining={4} limit={100} />);
    const frame = lastFrame();
    expect(stripAnsi(frame!)).toBe('[Quota: 4.0%]');
  });
});
