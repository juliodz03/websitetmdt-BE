import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Discount from '../models/Discount.js';
import connectDB from '../config/database.js';

const categories = ['Laptops', 'Monitors', 'Hard Drives', 'Keyboards', 'Mice', 'Headphones'];
const brands = ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Samsung', 'LG', 'Logitech', 'Razer', 'Corsair'];

const generateVariants = (basePrice, category, productIndex) => {
  const variants = [];
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  if (category === 'Laptops') {
    const configs = [
      { ram: '8GB', storage: '256GB SSD', price: basePrice },
      { ram: '16GB', storage: '512GB SSD', price: basePrice * 1.3 },
      { ram: '32GB', storage: '1TB SSD', price: basePrice * 1.6 }
    ];
    
    configs.forEach((config, idx) => {
      variants.push({
        sku: `LAP-${timestamp}-${productIndex}-${idx}-${randomSuffix}`,
        name: `${config.ram} RAM / ${config.storage}`,
        price: Math.round(config.price),
        inventory: Math.floor(Math.random() * 50) + 10,
        attributes: new Map(Object.entries(config))
      });
    });
  } else if (category === 'Monitors') {
    const sizes = [
      { size: '24"', resolution: '1080p', price: basePrice },
      { size: '27"', resolution: '1440p', price: basePrice * 1.4 },
      { size: '32"', resolution: '4K', price: basePrice * 2 }
    ];
    
    sizes.forEach((spec, idx) => {
      variants.push({
        sku: `MON-${timestamp}-${productIndex}-${idx}-${randomSuffix}`,
        name: `${spec.size} ${spec.resolution}`,
        price: Math.round(spec.price),
        inventory: Math.floor(Math.random() * 40) + 15,
        attributes: new Map(Object.entries(spec))
      });
    });
  } else if (category === 'Hard Drives') {
    const capacities = [
      { capacity: '500GB', type: 'HDD', price: basePrice },
      { capacity: '1TB', type: 'SSD', price: basePrice * 2 },
      { capacity: '2TB', type: 'SSD', price: basePrice * 3.5 }
    ];
    
    capacities.forEach((spec, idx) => {
      variants.push({
        sku: `HDD-${timestamp}-${productIndex}-${idx}-${randomSuffix}`,
        name: `${spec.capacity} ${spec.type}`,
        price: Math.round(spec.price),
        inventory: Math.floor(Math.random() * 60) + 20,
        attributes: new Map(Object.entries(spec))
      });
    });
  } else {
    const colors = ['Black', 'White', 'Silver'];
    colors.forEach((color, idx) => {
      variants.push({
        sku: `${category.substring(0, 3).toUpperCase()}-${timestamp}-${productIndex}-${idx}-${randomSuffix}`,
        name: `${color} Edition`,
        price: Math.round(basePrice * (1 + idx * 0.1)),
        inventory: Math.floor(Math.random() * 50) + 10,
        attributes: new Map([['color', color]])
      });
    });
  }
  
  return variants;
};

const generateProducts = (count) => {
  const products = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const basePrice = Math.floor(Math.random() * 15000000) + 2000000; // 2M - 17M VND
    const productName = `${brand} ${category.slice(0, -1)} ${1000 + i}`;
    
    // Generate slug manually since insertMany doesn't trigger pre-save hooks
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const product = {
      name: productName,
      slug: slug,
      shortDescription: `${category === 'Laptops' ? 'Laptop' : category === 'Monitors' ? 'Màn hình' : category === 'Hard Drives' ? 'Ổ cứng' : category === 'Keyboards' ? 'Bàn phím' : category === 'Mice' ? 'Chuột' : 'Tai nghe'} cao cấp từ ${brand}. Tích hợp công nghệ tiên tiến và chất lượng xây dựng vượt trội. Hoàn hảo cho cả mục đích chuyên nghiệp và cá nhân. Thiết kế tập trung vào trải nghiệm người dùng. Đi kèm bảo hành toàn diện và hỗ trợ tận tình. Hiệu suất xuất sắc vượt mong đợi. Lý tưởng cho công việc đòi hỏi cao và sử dụng hàng ngày.`,
      brand,
      category,
      tags: [category.toLowerCase(), brand.toLowerCase(), 'tech', 'electronics'],
      images: [
        { url: `https://picsum.photos/seed/${i}a/800/600`, alt: `${category} image 1` },
        { url: `https://picsum.photos/seed/${i}b/800/600`, alt: `${category} image 2` },
        { url: `https://picsum.photos/seed/${i}c/800/600`, alt: `${category} image 3` },
        { url: `https://picsum.photos/seed/${i}d/800/600`, alt: `${category} image 4` }
      ],
      variants: generateVariants(basePrice, category, i),
      basePrice,
      averageRating: Math.floor(Math.random() * 20 + 30) / 10, // 3.0 - 5.0
      totalRatings: Math.floor(Math.random() * 100),
      totalReviews: Math.floor(Math.random() * 50),
      isFeatured: i < 10,
      soldCount: Math.floor(Math.random() * 200)
    };
    
    products.push(product);
  }
  
  return products;
};

const seed = async () => {
  try {
    await connectDB();
    
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    
    // Create admin user
    console.log('Creating admin user...');
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@ecommerce.com',
      fullName: 'Admin User',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
      isEmailVerified: true
    });
    console.log(`Admin created: ${admin.email}`);
    
    // Create sample customer
    console.log('Creating sample customers...');
    await User.create([
      {
        email: 'customer@example.com',
        fullName: 'John Doe',
        password: 'Customer@123',
        role: 'customer',
        loyaltyPoints: 150,
        addresses: [{
          label: 'Home',
          fullName: 'John Doe',
          phone: '0123456789',
          street: '123 Main Street',
          city: 'Ho Chi Minh City',
          province: 'Ho Chi Minh',
          country: 'Vietnam',
          isDefault: true
        }]
      },
      {
        email: 'jane@example.com',
        fullName: 'Jane Smith',
        password: 'Customer@123',
        role: 'customer',
        loyaltyPoints: 250,
        addresses: [{
          label: 'Office',
          fullName: 'Jane Smith',
          phone: '0987654321',
          street: '456 Business Ave',
          city: 'Hanoi',
          province: 'Hanoi',
          country: 'Vietnam',
          isDefault: true
        }]
      }
    ]);
    
    // Create products
    console.log('Creating products...');
    const products = generateProducts(60);
    await Product.insertMany(products);
    console.log(`Created ${products.length} products`);
    
    // Create some discount codes
    await Discount.deleteMany({});
    
    console.log('Creating discount codes...');
    await Discount.create([
      {
        code: 'SAV10',
        valueType: 'percent',
        value: 10,
        usageLimit: 10,
        createdBy: admin._id
      },
      {
        code: 'SAVE5',
        valueType: 'percent',
        value: 5,
        usageLimit: 10,
        createdBy: admin._id
      },
      {
        code: 'NEW50',
        valueType: 'fixed',
        value: 50000,
        usageLimit: 10,
        createdBy: admin._id
      }
    ]);
    
    console.log('✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log(`Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    console.log('Customer: customer@example.com / Customer@123');
    console.log('\nDiscount codes: SAVE10, SAVE5, NEW50');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
