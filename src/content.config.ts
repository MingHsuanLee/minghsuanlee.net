import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.enum(['ba', 'wr', 'se', 'pm', 'ts', 'da', 'ming']),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['en', 'zh-tw']).default('en'),
    series: z.string().optional(),
    description: z.string().optional(),
    hero_image: z.string().optional(),
  }),
});

export const collections = { blog };
