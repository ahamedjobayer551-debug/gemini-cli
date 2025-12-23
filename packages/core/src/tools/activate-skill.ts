/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { Config } from '../config/config.js';
import { ACTIVATE_SKILL_TOOL_NAME } from './tool-names.js';

/**
 * Parameters for the ActivateSkill tool
 */
export interface ActivateSkillToolParams {
  /**
   * The name of the skill to activate
   */
  name: string;
}

class ActivateSkillToolInvocation extends BaseToolInvocation<
  ActivateSkillToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ActivateSkillToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    const skillName = this.params.name;
    const skill = this.config
      .getSkillManager()
      .getSkills()
      .find((s) => s.name === skillName);
    if (skill) {
      return `activating skill "${skillName}": ${skill.description}`;
    }
    return `activating skill "${skillName}"`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const skillName = this.params.name;
    const skillManager = this.config.getSkillManager();
    const skills = skillManager.getSkills();
    const skill = skills.find((s) => s.name === skillName);

    if (!skill) {
      return {
        llmContent: `Error: Skill "${skillName}" not found. Available skills are: ${skills.map((s) => s.name).join(', ')}`,
        returnDisplay: `Skill "${skillName}" not found.`,
      };
    }

    const content = await skillManager.getSkillContent(skillName);
    if (!content) {
      return {
        llmContent: `Error: Could not read content for skill "${skillName}".`,
        returnDisplay: `Error reading skill "${skillName}".`,
      };
    }

    skillManager.activateSkill(skillName);

    return {
      llmContent: `Skill "${skillName}" activated successfully. Here are its detailed instructions and rules. You MUST follow them strictly:

# Skill: ${content.name}
${content.body}`,
      returnDisplay: `Skill "${skillName}" activated.`,
    };
  }
}

/**
 * Implementation of the ActivateSkill tool logic
 */
export class ActivateSkillTool extends BaseDeclarativeTool<
  ActivateSkillToolParams,
  ToolResult
> {
  static readonly Name = ACTIVATE_SKILL_TOOL_NAME;

  constructor(
    private config: Config,
    messageBus?: MessageBus,
  ) {
    const skills = config.getSkillManager().getSkills();
    const skillNames = skills.map((s) => s.name);

    let schema: z.ZodTypeAny;
    if (skillNames.length === 0) {
      schema = z.object({
        name: z.string().describe('No skills are currently available.'),
      });
    } else {
      schema = z.object({
        name: z
          .enum(skillNames as [string, ...string[]])
          .describe('The name of the skill to activate.'),
      });
    }

    super(
      ActivateSkillTool.Name,
      'ActivateSkill',
      "Activates a specialized agent skill by name. Once activated, the skill's full instructions and rules are returned as a tool result and injected into the conversation. You MUST strictly follow these instructions for all subsequent turns. Use this when you identify a task that matches a skill's description.",
      Kind.Other,
      zodToJsonSchema(schema),
      true,
      false,
      messageBus,
    );
  }

  protected createInvocation(
    params: ActivateSkillToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<ActivateSkillToolParams, ToolResult> {
    return new ActivateSkillToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
