import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_CATEGORY_NAMES } from './default-categories';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);
  private ensurePromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    return this.ensureDefaultCategories();
  }

  async findAll() {
    await this.ensureDefaultCategories();
    return this.prisma.category.findMany({
      where: { name: { not: 'Uncategorized' } },
      orderBy: { name: 'asc' },
    });
  }

  // Upsert by unique name. A reboot, a second request, or a migration that
  // already inserted these rows updates nothing and does not add copies.
  private ensureDefaultCategories(): Promise<void> {
    if (this.ensurePromise) return this.ensurePromise;

    this.ensurePromise = this.upsertDefaults().catch((err) => {
      this.ensurePromise = null;
      this.logger.error(`Could not ensure default categories: ${err}`);
    });

    return this.ensurePromise;
  }

  private async upsertDefaults() {
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await this.prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }
}
