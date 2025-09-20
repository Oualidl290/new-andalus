import { checkDatabaseConnection, createUser, getUserByEmail } from './index'

export async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  const connectionResult = await checkDatabaseConnection()
  console.log(connectionResult.success ? '✅' : '❌', connectionResult.message)
  
  if (!connectionResult.success) {
    return false
  }

  try {
    // Test creating a user
    console.log('🔍 Testing user creation...')
    const testUser = await createUser({
      email: 'test@newandalus.com',
      name: 'Test User',
      role: 'editor',
    })
    console.log('✅ User created:', testUser.id)

    // Test querying the user
    console.log('🔍 Testing user query...')
    const foundUser = await getUserByEmail('test@newandalus.com')
    console.log('✅ User found:', foundUser?.name)

    return true
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return false
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error)
      process.exit(1)
    })
}