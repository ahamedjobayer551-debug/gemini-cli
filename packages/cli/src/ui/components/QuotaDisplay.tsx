/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text } from 'ink';
import {
  getStatusColor,
  QUOTA_THRESHOLD_HIGH,
  QUOTA_THRESHOLD_MEDIUM,
} from '../utils/displayUtils.js';

interface QuotaDisplayProps {
  remaining: number | undefined;
  limit: number | undefined;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  remaining,
  limit,
}) => {
  if (remaining === undefined || limit === undefined || limit === 0) {
    return null;
  }

  const percentage = (remaining / limit) * 100;

  const color = getStatusColor(percentage, {
    green: QUOTA_THRESHOLD_HIGH,
    yellow: QUOTA_THRESHOLD_MEDIUM,
  });

  return <Text color={color}>[Quota: {percentage.toFixed(1)}%]</Text>;
};
