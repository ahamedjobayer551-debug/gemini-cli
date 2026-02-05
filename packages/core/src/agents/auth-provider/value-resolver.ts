/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import { debugLogger } from '../../utils/debugLogger.js';
import { getShellConfiguration } from '../../utils/shell-utils.js';

/**
 * Resolves a value that may be an environment variable reference,
 * a shell command, or a literal value.
 *
 * Supported formats:
 * - `$ENV_VAR`: Read from environment variable
 * - `!command`: Execute shell command and use output (trimmed)
 * - Any other string: Use as literal value
 *
 * @param value The value to resolve
 * @returns The resolved value
 * @throws Error if environment variable is not set or command fails
 */
export async function resolveAuthValue(value: string): Promise<string> {
  // Support escaping with double prefix (e.g. $$ or !!)
  if (value.startsWith('$$') || value.startsWith('!!')) {
    return value.slice(1);
  }

  // Environment variable: $MY_VAR
  if (value.startsWith('$')) {
    const envVar = value.slice(1);
    const resolved = process.env[envVar];
    if (resolved === undefined || resolved === '') {
      throw new Error(
        `Environment variable '${envVar}' is not set or is empty. ` +
          `Please set it before using this agent.`,
      );
    }
    debugLogger.debug(`[AuthValueResolver] Resolved env var: ${envVar}`);
    return resolved;
  }

  // Shell command: !command arg1 arg2
  if (value.startsWith('!')) {
    const command = value.slice(1).trim();
    if (!command) {
      throw new Error('Empty command in auth value. Expected format: !command');
    }

    debugLogger.debug(`[AuthValueResolver] Executing command for auth value`);

    const shellConfig = getShellConfiguration();
    const result = await executeCommand(shellConfig.executable, [
      ...shellConfig.argsPrefix,
      command,
    ]);

    const trimmed = result.trim();
    if (!trimmed) {
      throw new Error(`Command '${command}' returned empty output`);
    }
    return trimmed;
  }

  // Literal value - return as-is
  return value;
}

/**
 * Execute a command using spawn and return the output.
 */
function executeCommand(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (data: string) => {
      stdout += data;
    });

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (data: string) => {
      stderr += data;
    });

    child.on('error', (err) => {
      reject(new Error(`Command failed to execute: ${err.message}`));
    });

    child.on('close', (code, signal) => {
      if (signal === 'SIGTERM') {
        reject(
          new Error(`Command timed out or was terminated after 30 seconds`),
        );
      } else if (signal) {
        reject(new Error(`Command terminated by signal ${signal}`));
      } else if (code !== 0) {
        const errorMsg = stderr.trim() || `Exit code ${code}`;
        reject(new Error(`Command failed: ${errorMsg}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Check if a value needs resolution (is an env var or command reference).
 */
export function needsResolution(value: string): boolean {
  return value.startsWith('$') || value.startsWith('!');
}

/**
 * Mask a sensitive value for logging purposes.
 * Shows the first and last 2 characters with asterisks in between.
 */
export function maskSensitiveValue(value: string): string {
  if (value.length <= 12) {
    return '****';
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
