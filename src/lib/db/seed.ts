import { createUserWithPassword } from '../auth/queries'
import { createArticle } from './queries'

export async function seedDatabase() {
  console.log('🌱 Seeding database...')

  try {
    // Create admin user
    const adminUser = await createUserWithPassword({
      email: 'admin@newandalus.com',
      name: 'Admin User',
      password: 'Admin123!',
      role: 'admin',
    })
    console.log('✅ Created admin user:', adminUser.id)

    // Create editor user
    const editorUser = await createUserWithPassword({
      email: 'editor@newandalus.com',
      name: 'Editor User',
      password: 'Editor123!',
      role: 'editor',
    })
    console.log('✅ Created editor user:', editorUser.id)

    // Create sample articles
    const article1 = await createArticle({
      title: 'Welcome to New Andalus',
      slug: 'welcome-to-new-andalus',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Welcome to New Andalus, a modern editorial platform built with cutting-edge technologies.',
              },
            ],
          },
        ],
      },
      excerpt: 'An introduction to the New Andalus editorial platform.',
      status: 'published',
      publishedAt: new Date(),
      authorId: adminUser.id,
      seoMeta: {
        title: 'Welcome to New Andalus - Modern Editorial Platform',
        description: 'Discover New Andalus, a cutting-edge editorial platform for modern content creation.',
        keywords: ['editorial', 'platform', 'content', 'publishing'],
      },
    })
    console.log('✅ Created article:', article1.id)

    const article2 = await createArticle({
      title: 'Getting Started with Content Creation',
      slug: 'getting-started-content-creation',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Learn how to create compelling content using our rich text editor and publishing tools.',
              },
            ],
          },
        ],
      },
      excerpt: 'A guide to creating your first article on New Andalus.',
      status: 'published',
      publishedAt: new Date(),
      authorId: editorUser.id,
    })
    console.log('✅ Created article:', article2.id)

    console.log('🎉 Database seeding completed successfully!')
    return { success: true, message: 'Database seeded successfully' }
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    return { 
      success: false, 
      message: `Database seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('❌ Seed execution failed:', error)
      process.exit(1)
    })
}