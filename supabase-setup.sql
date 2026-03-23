-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-running
DROP TABLE IF EXISTS category_media CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create Categories Table (Category is the main entity now)
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  info_details TEXT,
  price DECIMAL(10, 2),
  discount_price DECIMAL(10, 2),
  instagram_link TEXT,
  pinterest_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Category Media Table (For multiple images and videos per category)
CREATE TABLE category_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL DEFAULT 'image', -- 'image' or 'video'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Note: Please go to Storage in Supabase and create a public bucket named "fabric_media".
-- Configure policies to allow public read access to the bucket.
