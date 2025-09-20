import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published', 'archived'])
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'reader'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('editor').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Articles table
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: jsonb('content').notNull(),
  excerpt: text('excerpt'),
  status: articleStatusEnum('status').default('draft').notNull(),
  publishedAt: timestamp('published_at'),
  authorId: uuid('author_id').notNull().references(() => users.id),
  featuredImage: jsonb('featured_image'),
  seoMeta: jsonb('seo_meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
}))

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert