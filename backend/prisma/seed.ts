import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // Create admin user per SPEC.md Section 19 Phase 1
  const adminEmail = 'admin@supplychanger.local';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    // Hash password with bcrypt (using 12 rounds per SPEC.md Section 12/16)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('Admin@123', saltRounds);

    const admin = await prisma.user.create({
      data: {
        fullName: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(`Created admin user: ${admin.email} (ID: ${admin.id})`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // Create sample suppliers
  const suppliersData = [
    { name: 'Global Supply MMC', phone: '+994 50 111 22 33', email: 'info@globalsupply.az', address: 'Bakı, Azərbaycan' },
    { name: 'Baku Tech Distribution', phone: '+994 55 222 33 44', email: 'sales@bakutech.az', address: 'Sumqayıt, Azərbaycan' },
    { name: 'Euro Foods Group', phone: '+994 70 333 44 55', email: 'contact@eurofoods.az', address: 'Bakı, Azərbaycan' },
  ];

  const seededSuppliers = [];
  for (const s of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      const supplier = await prisma.supplier.create({ data: s });
      console.log(`Created supplier: ${supplier.name}`);
      seededSuppliers.push(supplier);
    } else {
      console.log(`Supplier already exists: ${s.name}`);
      seededSuppliers.push(existing);
    }
  }

  // Create sample products
  const productsData = [
    { name: 'iPhone 15 Pro Max', sku: 'IPH15PM-256', stock: 45, minimumStock: 5, supplierId: seededSuppliers[0]?.id },
    { name: 'Samsung Galaxy S24 Ultra', sku: 'SAMS24U-512', stock: 30, minimumStock: 5, supplierId: seededSuppliers[1]?.id },
    { name: 'MacBook Pro 16 M3', sku: 'MACBPRO16-M3', stock: 12, minimumStock: 3, supplierId: seededSuppliers[0]?.id },
    { name: 'Coca-Cola 0.33L', sku: 'COKE-033', stock: 120, minimumStock: 20, supplierId: seededSuppliers[2]?.id },
  ];

  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const product = await prisma.product.create({ data: p });
      console.log(`Created product: ${product.name}`);
    } else {
      console.log(`Product already exists: ${p.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
