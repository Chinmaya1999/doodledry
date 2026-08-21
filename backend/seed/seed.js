import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import env from '../src/config/env.js';
import User, { ROLES } from '../src/models/User.js';
import AgeGroup from '../src/models/AgeGroup.js';
import Design from '../src/models/Design.js';
import ProductType from '../src/models/ProductType.js';
import Color from '../src/models/Color.js';

const AGE_GROUPS = [
  { name: '0-6 Months', code: '06M', sortOrder: 1 },
  { name: '6-12 Months', code: '612M', sortOrder: 2 },
  { name: '12-18 Months', code: '1218M', sortOrder: 3 },
  { name: '18-24 Months', code: '1824M', sortOrder: 4 },
  { name: '2-3 Years', code: '23Y', sortOrder: 5 },
  { name: '3-4 Years', code: '34Y', sortOrder: 6 },
  { name: '4-5 Years', code: '45Y', sortOrder: 7 },
];

const DESIGNS = [
  { name: 'Happy Unicorn', code: 'HUN' },
  { name: "Let's Play", code: 'LPL' },
  { name: 'Abra Jirafa', code: 'ABJ' },
  { name: 'Turtles', code: 'TRT' },
  { name: 'Jolly Caterpillar', code: 'JCT' },
  { name: 'Playful Panda', code: 'PPD' },
  { name: 'Elephant & Donkey', code: 'END' },
  { name: 'Baby Moon', code: 'BMN' },
  { name: 'Pumpkin Flower', code: 'PKF' },
  { name: 'Giraffe Family', code: 'GRF' },
  { name: 'Solar Monkey', code: 'SLM' },
  { name: 'Frog Family', code: 'FRF' },
  { name: 'Blooming Daisy', code: 'BLD' },
  { name: 'Fire Truck', code: 'FTK' },
  { name: 'Solid', code: 'SLD', isSolid: true },
];

const PRODUCT_TYPES = [
  { name: 'Full Sleeve', code: 'FS' },
  { name: 'Half Sleeve', code: 'HS' },
  { name: 'Onesie', code: 'ON' },
  { name: 'Romper', code: 'RO' },
  { name: 'Solid Shirt', code: 'SSH' },
  { name: 'Solid Pant', code: 'SPT' },
];

const COLORS = [
  { name: 'Red', code: 'RED', hexCode: '#DC2626' },
  { name: 'Brown', code: 'BRN', hexCode: '#92400E' },
  { name: 'Green', code: 'GRN', hexCode: '#16A34A' },
  { name: 'White', code: 'WHT', hexCode: '#F9FAFB' },
];

async function upsertMany(Model, items, key = 'code') {
  let created = 0;
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Model.updateOne({ [key]: item[key] }, { $setOnInsert: item }, { upsert: true });
    if (res.upsertedCount) created += 1;
  }
  return created;
}

async function run() {
  await connectDB();
  console.log('[seed] Connected to MongoDB.');

  const ageGroupsCreated = await upsertMany(AgeGroup, AGE_GROUPS);
  console.log(`[seed] Age groups: ${ageGroupsCreated} created (of ${AGE_GROUPS.length}).`);

  const designsCreated = await upsertMany(Design, DESIGNS);
  console.log(`[seed] Designs: ${designsCreated} created (of ${DESIGNS.length}).`);

  const typesCreated = await upsertMany(ProductType, PRODUCT_TYPES);
  console.log(`[seed] Product types: ${typesCreated} created (of ${PRODUCT_TYPES.length}).`);

  const colorsCreated = await upsertMany(Color, COLORS);
  console.log(`[seed] Colors: ${colorsCreated} created (of ${COLORS.length}).`);

  const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (!existingSuperAdmin) {
    const passwordHash = await User.hashPassword(env.seedSuperAdmin.password);
    await User.create({
      name: env.seedSuperAdmin.name,
      email: env.seedSuperAdmin.email,
      phone: env.seedSuperAdmin.phone,
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      isActive: true,
    });
    console.log(`[seed] Super Admin created: ${env.seedSuperAdmin.email}`);
    console.log('[seed] IMPORTANT: change the default password after first login.');
  } else {
    console.log(`[seed] Super Admin already exists: ${existingSuperAdmin.email}`);
  }

  console.log('[seed] Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
