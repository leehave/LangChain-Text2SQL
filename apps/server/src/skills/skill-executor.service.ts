import { Injectable, Logger } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import type { 
  SkillExecutionRequest, 
  SkillExecutionResult,
  SkillExecutionResponse,
  SkillParameter 
} from '@chatbot/shared';

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);

  constructor(private skillRegistry: SkillRegistryService) {}

  /**
   * Execute a skill with given parameters
   */
  async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    const startTime = Date.now();
    
    try {
      // Get the skill definition
      const skill = this.skillRegistry.getSkill(request.skillId);
      if (!skill) {
        throw new Error(`Skill with ID ${request.skillId} not found`);
      }

      // Validate parameters
      const validationErrors = this.validateParameters(skill.parameters, request.parameters);
      if (validationErrors.length > 0) {
        throw new Error(`Parameter validation failed: ${validationErrors.join(', ')}`);
      }

      // Execute the appropriate skill handler
      const result = await this.executeSkillHandler(skill.id, request.parameters);

      const executionTime = Date.now() - startTime;
      
      return {
        result: {
          success: true,
          data: result,
          metadata: {
            executionTime,
            skillId: skill.id,
            parameters: request.parameters
          }
        },
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        result: {
          success: false,
          error: errorMessage,
          metadata: {
            executionTime,
            skillId: request.skillId
          }
        },
        executionTime
      };
    }
  }

  /**
   * Validate parameters against skill definition
   */
  private validateParameters(
    expectedParams: SkillParameter[], 
    providedParams: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    for (const param of expectedParams) {
      if (param.required && !(param.name in providedParams)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (param.name in providedParams) {
        const value = providedParams[param.name];
        const expectedType = param.type;

        // Type checking
        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Parameter ${param.name} should be of type string, got ${typeof value}`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Parameter ${param.name} should be of type number, got ${typeof value}`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter ${param.name} should be of type boolean, got ${typeof value}`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Parameter ${param.name} should be of type array, got ${typeof value}`);
        } else if (expectedType === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
          errors.push(`Parameter ${param.name} should be of type object, got ${Array.isArray(value) ? 'array' : typeof value}`);
        }
      }
    }

    return errors;
  }

  /**
   * Execute the actual skill handler based on skill ID
   */
  private async executeSkillHandler(skillId: string, parameters: Record<string, any>): Promise<any> {
    // In a real implementation, this would route to specific skill handlers
    // For now, we'll simulate different skill behaviors based on ID
    
    switch (skillId) {
      case 'calculator':
        return this.handleCalculatorSkill(parameters);
      case 'web-search':
        return this.handleWebSearchSkill(parameters);
      case 'file-operations':
        return this.handleFileOperationsSkill(parameters);
      case 'database-query':
        return this.handleDatabaseQuerySkill(parameters);
      default:
        // For unknown skills, return the parameters as is (for testing purposes)
        return {
          skillId,
          parameters,
          executedAt: new Date().toISOString(),
          result: 'Skill executed successfully'
        };
    }
  }

  /**
   * Handler for calculator skill
   */
  private async handleCalculatorSkill(params: Record<string, any>): Promise<any> {
    const { expression } = params;
    
    // Simple calculator implementation (in a real app, use a proper math library)
    if (expression && typeof expression === 'string') {
      // Basic arithmetic evaluation (should be safe for our demo)
      try {
        // Replace with safer eval alternative in production
        const sanitizedExpression = expression.replace(/[^-()\d/*+.]/g, '');
        // For security reasons, in production you'd want to use a proper expression parser
        // For demo purposes, we'll just return the expression
        return {
          expression: sanitizedExpression,
          result: `Calculated result for: ${sanitizedExpression}`
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Calculation failed: ${errorMessage}`);
      }
    }
    
    throw new Error('Calculator skill requires "expression" parameter');
  }

  /**
   * Handler for web search skill
   */
  private async handleWebSearchSkill(params: Record<string, any>): Promise<any> {
    const { query, maxResults = 5 } = params;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Web search skill requires "query" parameter as string');
    }
    
    // Simulate web search (in real implementation, call actual search API)
    return {
      query,
      maxResults,
      results: [
        {
          title: `Search results for "${query}"`,
          url: 'https://example.com',
          snippet: `Simulated search results for ${query}`
        }
      ],
      searchedAt: new Date().toISOString()
    };
  }

  /**
   * Handler for file operations skill
   */
  private async handleFileOperationsSkill(params: Record<string, any>): Promise<any> {
    const { operation, filePath, content } = params;
    
    if (!operation || typeof operation !== 'string') {
      throw new Error('File operations skill requires "operation" parameter');
    }
    
    // Simulate file operations (in real implementation, perform actual file operations)
    return {
      operation,
      filePath,
      content: content ? 'Content would be processed' : undefined,
      result: `File operation ${operation} simulated successfully`
    };
  }

  /**
   * Handler for database query skill
   */
  private async handleDatabaseQuerySkill(params: Record<string, any>): Promise<any> {
    const { query, parameters: queryParams } = params;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Database query skill requires "query" parameter');
    }
    
    // Simulate database query (in real implementation, execute actual query)
    return {
      query,
      parameters: queryParams,
      result: 'Query executed successfully (simulated)',
      rowsAffected: Math.floor(Math.random() * 100)
    };
  }
}