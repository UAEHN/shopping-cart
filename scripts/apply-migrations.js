// Script to apply SQL migrations to Supabase
// Run with: node scripts/apply-migrations.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Supabase migration application...');

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'inherit' });
  console.log('Supabase CLI is installed.');
} catch (error) {
  console.error('Supabase CLI is not installed. Please install it first:');
  console.error('npm install -g supabase');
  process.exit(1);
}

// Apply migrations
try {
  console.log('Applying migrations to Supabase...');
  execSync('supabase db push', { stdio: 'inherit' });
  console.log('Migrations applied successfully.');
} catch (error) {
  console.error('Failed to apply migrations:', error.message);
  process.exit(1);
}

console.log('Migration process completed.');
