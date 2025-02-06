import { getDb, initDb } from './db.js';
import fs from 'fs/promises';

async function loadInitialData() {
  try {
    const db = await getDb();
    await initDb();
    
    // for json data
    const data = JSON.parse(await fs.readFile('data.json', 'utf8'));
    
    for (const user of data) {
      // inserting user
      const { lastID: userId } = await db.run(
        'INSERT OR IGNORE INTO users (name, email, phone, badge_code) VALUES (?, ?, ?, ?)',
        [user.name, user.email, user.phone, user.badge_code]
      );
      

      for (const scan of user.scans || []) {

        const { lastID: activityId } = await db.run(
          'INSERT OR IGNORE INTO activities (name, category) VALUES (?, ?)',
          [scan.activity_name, scan.activity_category]
        );
        
        const { id: actualActivityId } = await db.get(
          'SELECT id FROM activities WHERE name = ?',
          [scan.activity_name]
        );
        
        await db.run(
          'INSERT INTO scans (user_id, activity_id, scanned_at) VALUES (?, ?, ?)',
          [userId, actualActivityId, scan.scanned_at]
        );
      }
    }
    
    console.log('Initial data loaded successfully');
  } catch (error) {
    console.error('Error loading initial data:', error);
    process.exit(1);
  }
}

loadInitialData();