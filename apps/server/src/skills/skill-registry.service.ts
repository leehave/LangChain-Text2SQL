import { Injectable, Logger } from '@nestjs/common';
import type { SkillDefinition } from '@chatbot/shared';

@Injectable()
export class SkillRegistryService {
  private readonly logger = new Logger(SkillRegistryService.name);
  private skills: Map<string, SkillDefinition> = new Map();

  /**
   * Register a skill in the registry
   */
  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
    this.logger.log(`Registered skill: ${skill.name} (${skill.id})`);
  }

  /**
   * Unregister a skill from the registry
   */
  unregisterSkill(skillId: string): void {
    this.skills.delete(skillId);
    this.logger.log(`Unregistered skill: ${skillId}`);
  }

  /**
   * Get a skill definition by ID
   */
  getSkill(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all registered skills
   */
  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Check if a skill exists
   */
  hasSkill(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: string): SkillDefinition[] {
    return Array.from(this.skills.values()).filter(skill => skill.category === category);
  }
}