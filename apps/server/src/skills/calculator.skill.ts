import { Injectable, Logger } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import type { SkillDefinition } from '@chatbot/shared';

@Injectable()
export class CalculatorSkill {
  private readonly logger = new Logger(CalculatorSkill.name);

  constructor(private skillRegistry: SkillRegistryService) {
    this.registerSkill();
  }

  private registerSkill(): void {
    const skillDefinition: SkillDefinition = {
      id: 'calculator',
      name: 'Calculator',
      description: 'Performs mathematical calculations',
      parameters: [
        {
          name: 'expression',
          type: 'string',
          required: true,
          description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")'
        }
      ],
      category: 'math',
      version: '1.0.0',
      author: 'System'
    };

    this.skillRegistry.registerSkill(skillDefinition);
    this.logger.log('Calculator skill registered');
  }

  /**
   * Execute the calculator skill
   */
  async execute(expression: string): Promise<any> {
    // Sanitize the expression to prevent code injection
    const sanitizedExpression = expression.replace(/[^-()\d/*+. ]/g, '');
    
    try {
      // In a real application, use a proper math expression evaluator
      // For security reasons, never use eval() directly
      // Here we just simulate the calculation
      return {
        expression: sanitizedExpression,
        result: `Calculated result for: ${sanitizedExpression}`,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Calculation failed for expression: ${expression}`, error);
      throw new Error(`Calculation failed: ${(error as Error).message}`);
    }
  }
}