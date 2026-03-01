import { Injectable, Logger } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import type { SkillDefinition } from '@chatbot/shared';

@Injectable()
export class WebSearchSkill {
  private readonly logger = new Logger(WebSearchSkill.name);

  constructor(private skillRegistry: SkillRegistryService) {
    this.registerSkill();
  }

  private registerSkill(): void {
    const skillDefinition: SkillDefinition = {
      id: 'web-search',
      name: 'Web Search',
      description: 'Performs web searches to find information',
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'Search query to execute'
        },
        {
          name: 'maxResults',
          type: 'number',
          required: false,
          description: 'Maximum number of results to return (default: 5)',
          defaultValue: 5
        }
      ],
      category: 'information',
      version: '1.0.0',
      author: 'System'
    };

    this.skillRegistry.registerSkill(skillDefinition);
    this.logger.log('Web Search skill registered');
  }

  /**
   * Execute the web search skill
   */
  async execute(query: string, maxResults: number = 5): Promise<any> {
    if (!query || typeof query !== 'string') {
      throw new Error('Web search requires a valid query string');
    }

    try {
      // In a real application, this would call an actual search API
      // For simulation purposes, we'll return mock results
      const results = Array.from({ length: Math.min(maxResults, 10) }, (_, i) => ({
        id: `result-${i + 1}`,
        title: `Simulated search result ${i + 1} for "${query}"`,
        url: `https://example${i + 1}.com`,
        snippet: `This is a simulated search result snippet for the query "${query}". Result ${i + 1} of ${Math.min(maxResults, 10)}.`,
        relevanceScore: Math.random()
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

      return {
        query,
        maxResults,
        results,
        searchedAt: new Date().toISOString(),
        totalResults: results.length
      };
    } catch (error) {
      this.logger.error(`Web search failed for query: ${query}`, error);
      throw new Error(`Web search failed: ${(error as Error).message}`);
    }
  }
}