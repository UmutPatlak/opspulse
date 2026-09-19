import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

async function seed() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:5432/opspulse_db';

  console.log('🌱 Starting OpsPulse database seed...');
  console.log(`Connecting to database at ${databaseUrl.replace(/:([^:@]+)@/, ':****@')}...`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  try {
    // 1. Seed or find default Tenant: Acme Logistics
    const defaultSlug = 'acme-logistics';
    let [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, defaultSlug))
      .limit(1);

    if (!tenant) {
      console.log('📦 Creating default tenant "Acme Logistics"...');
      [tenant] = await db
        .insert(schema.tenants)
        .values({
          name: 'Acme Logistics',
          slug: defaultSlug,
          status: 'ACTIVE',
        })
        .returning();
      console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);
    } else {
      console.log(`ℹ️ Default tenant "${tenant.name}" already exists (ID: ${tenant.id}).`);
    }

    const saltRounds = 10;

    // 2. Seed Users
    const seedUsers = [
      {
        email: 'admin@acmelogistics.com',
        fullName: 'Acme Admin',
        role: 'TENANT_ADMIN',
        plainPassword: 'AdminPassword123!',
      },
      {
        email: 'dispatcher@acmelogistics.com',
        fullName: 'Sarah Dispatcher',
        role: 'DISPATCHER',
        plainPassword: 'Dispatcher123!',
      },
      {
        email: 'operator@acmelogistics.com',
        fullName: 'John Operator',
        role: 'OPERATOR',
        plainPassword: 'Operator123!',
      },
    ];

    for (const u of seedUsers) {
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, u.email))
        .limit(1);

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(u.plainPassword, saltRounds);
        const [newUser] = await db
          .insert(schema.users)
          .values({
            tenantId: tenant.id,
            email: u.email,
            passwordHash,
            fullName: u.fullName,
            role: u.role,
            isActive: true,
          })
          .returning();

        console.log(`👤 User created: ${newUser.email} [${newUser.role}] (ID: ${newUser.id})`);
      } else {
        console.log(`ℹ️ User already exists: ${existingUser.email} [${existingUser.role}]`);
      }
    }

    console.log('\n=============================================');
    console.log('🎉 Seed completed successfully!');
    console.log('Test Accounts available:');
    console.log('1. TENANT_ADMIN: admin@acmelogistics.com      / AdminPassword123!');
    console.log('2. DISPATCHER:   dispatcher@acmelogistics.com / Dispatcher123!');
    console.log('3. OPERATOR:     operator@acmelogistics.com   / Operator123!');
    console.log('Tenant Slug:     acme-logistics');
    console.log('=============================================\n');
  } catch (error) {
    console.error('❌ Error while seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
