import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { SkillExecutorService } from './skill-executor.service';
import type { 
  SkillDefinition, 
  SkillExecutionRequest, 
  SkillExecutionResponse 
} from '@chatbot/shared';

@Controller('api/skills')
export class SkillsController {
  constructor(
    private readonly skillRegistry: SkillRegistryService,
    private readonly skillExecutor: SkillExecutorService,
  ) {}

  @Get()
  getAllSkills(): SkillDefinition[] {
    return this.skillRegistry.getAllSkills();
  }

  @Get(':id')
  getSkill(@Param('id') id: string): SkillDefinition | undefined {
    const skill = this.skillRegistry.getSkill(id);
    if (!skill) {
      throw new HttpException('Skill not found', HttpStatus.NOT_FOUND);
    }
    return skill;
  }

  @Get('category/:category')
  getSkillsByCategory(@Param('category') category: string): SkillDefinition[] {
    return this.skillRegistry.getSkillsByCategory(category);
  }

  @Post('execute')
  async executeSkill(@Body() request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    try {
      return await this.skillExecutor.executeSkill(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Skill execution failed';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}