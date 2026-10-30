import db from './db';

// Clear existing data
db.prepare('DELETE FROM installment_plans').run();
db.prepare('DELETE FROM motorcycles').run();

// Insert sample motorcycles (Honda only)
const motorcycles = [
  {
    name: 'Honda Wave 125i',
    model: 'Wave 125i',
    price: 59000,
    description: 'รถจักรยานยนต์คุณภาพสูง ประหยัดน้ำมัน เหมาะสำหรับการใช้งานทั่วไป',
    image_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&h=400&fit=crop'
  },
  {
    name: 'Honda Click 125i',
    model: 'Click 125i',
    price: 65000,
    description: 'สมาร์ทคีย์ ดีไซน์สปอร์ต เครื่องยนต์ eSP ประหยัดน้ำมัน',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500&h=400&fit=crop'
  },
  {
    name: 'Honda PCX 160',
    model: 'PCX 160',
    price: 85000,
    description: 'สกูตเตอร์รุ่นใหญ่ เครื่องยนต์ 160cc ขับสบาย หรูหรา',
    image_url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&h=400&fit=crop'
  },
  {
    name: 'Honda Scoopy i',
    model: 'Scoopy i',
    price: 72000,
    description: 'ดีไซน์คลาสสิก สวยงาม เหมาะกับทุกวัย',
    image_url: 'https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=500&h=400&fit=crop'
  }
];

const motorcycleIds: number[] = [];

motorcycles.forEach((motorcycle) => {
  const result = db.prepare(`
    INSERT INTO motorcycles (name, model, price, description, image_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(motorcycle.name, motorcycle.model, motorcycle.price, motorcycle.description, motorcycle.image_url);
  motorcycleIds.push(result.lastInsertRowid as number);
});

// Insert installment plans for each motorcycle
const installmentPlans = [
  // Honda Wave 125i
  { motorcycle_id: motorcycleIds[0], months: 12, monthly_payment: 5200, down_payment: 10000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[0], months: 18, monthly_payment: 3600, down_payment: 10000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[0], months: 24, monthly_payment: 2800, down_payment: 10000, interest_rate: 2.5 },

  // Honda Click 125i
  { motorcycle_id: motorcycleIds[1], months: 12, monthly_payment: 5800, down_payment: 13000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[1], months: 18, monthly_payment: 4000, down_payment: 13000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[1], months: 24, monthly_payment: 3200, down_payment: 13000, interest_rate: 2.5 },

  // Honda PCX 160
  { motorcycle_id: motorcycleIds[2], months: 12, monthly_payment: 7500, down_payment: 15000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[2], months: 18, monthly_payment: 5200, down_payment: 15000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[2], months: 24, monthly_payment: 4100, down_payment: 15000, interest_rate: 2.5 },

  // Honda Scoopy i
  { motorcycle_id: motorcycleIds[3], months: 12, monthly_payment: 6300, down_payment: 12000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[3], months: 18, monthly_payment: 4400, down_payment: 12000, interest_rate: 2.5 },
  { motorcycle_id: motorcycleIds[3], months: 24, monthly_payment: 3500, down_payment: 12000, interest_rate: 2.5 },
];

installmentPlans.forEach((plan) => {
  db.prepare(`
    INSERT INTO installment_plans (motorcycle_id, months, monthly_payment, down_payment, interest_rate)
    VALUES (?, ?, ?, ?, ?)
  `).run(plan.motorcycle_id, plan.months, plan.monthly_payment, plan.down_payment, plan.interest_rate);
});

console.log('Sample data seeded successfully!');
console.log(`Added ${motorcycles.length} motorcycles`);
console.log(`Added ${installmentPlans.length} installment plans`);
