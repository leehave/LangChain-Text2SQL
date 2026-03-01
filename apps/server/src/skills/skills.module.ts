import { Module } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { SkillExecutorService } from './skill-executor.service';
import { SkillsController } from './skills.controller';
import { CalculatorSkill } from './calculator.skill';
import { WebSearchSkill } from './web-search.skill';

@Module({
  providers: [
    SkillRegistryService,
    SkillExecutorService,
    CalculatorSkill,
    WebSearchSkill,
  ],
  controllers: [
    SkillsController,
  ],
  exports: [
    SkillRegistryService,
    SkillExecutorService,
  ],
})
export class SkillsModule {}