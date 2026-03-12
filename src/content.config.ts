import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.enum(['ba', 'wr', 'se', 'pm', 'ts', 'da', 'ming']),
    tags: z.array(z.string()).default([]),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    summary: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    status: z.string(),
    lead_agent: z.string(),
    description: z.string(),
    tech_stack: z.array(z.string()).default([]),
    last_updated: z.coerce.date(),
  }),
});

const episodes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    episode_number: z.number(),
    date: z.coerce.date(),
    description: z.string(),
    video_url: z.string().url(),
    agents_featured: z.array(z.string()).default([]),
  }),
});

const agents = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/agents' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    emoji: z.string(),
    bio: z.string(),
    capabilities: z.array(z.string()).default([]),
    avatar_url: z.string().optional(),
  }),
});

export const collections = { blog, news, projects, episodes, agents };
