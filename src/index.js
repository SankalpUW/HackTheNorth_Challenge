import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getDb } from './db.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all(`
      SELECT 
        u.*,
        json_group_array(
          json_object(
            'activity_name', a.name,
            'activity_category', a.category,
            'scanned_at', s.scanned_at
          )
        ) as scans
      FROM users u
      LEFT JOIN scans s ON u.id = s.user_id
      LEFT JOIN activities a ON s.activity_id = a.id
      GROUP BY u.id
    `);
    
    users.forEach(user => {
      user.scans = JSON.parse(user.scans);
      if (user.scans[0] === null) user.scans = [];
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/users/:identifier', async (req, res) => {
  try {
    const db = await getDb();
    const { identifier } = req.params;
    
    const user = await db.get(`
      SELECT 
        u.*,
        json_group_array(
          json_object(
            'activity_name', a.name,
            'activity_category', a.category,
            'scanned_at', s.scanned_at
          )
        ) as scans
      FROM users u
      LEFT JOIN scans s ON u.id = s.user_id
      LEFT JOIN activities a ON s.activity_id = a.id
      WHERE u.email = ? OR u.badge_code = ?
      GROUP BY u.id
    `, [identifier, identifier]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.scans = JSON.parse(user.scans);
    if (user.scans[0] === null) user.scans = [];
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/users/:identifier', async (req, res) => {
  try {
    const db = await getDb();
    const { identifier } = req.params;
    const updates = req.body;
    
    delete updates.id;
    delete updates.email;
    delete updates.badge_code;
    delete updates.updated_at;
    delete updates.scans;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), identifier, identifier];
    
    const result = await db.run(`
      UPDATE users 
      SET ${setClause}
      WHERE email = ? OR badge_code = ?
    `, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = await db.get(`
      SELECT * FROM users 
      WHERE email = ? OR badge_code = ?
    `, [identifier, identifier]);
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/scan/:identifier', async (req, res) => {
  try {
    const db = await getDb();
    const { identifier } = req.params;
    const { activity_name, activity_category } = req.body;
    
    if (!activity_name || !activity_category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await db.get(
      'SELECT id FROM users WHERE email = ? OR badge_code = ?',
      [identifier, identifier]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await db.run(
      'INSERT OR IGNORE INTO activities (name, category) VALUES (?, ?)',
      [activity_name, activity_category]
    );
    
    const activity = await db.get(
      'SELECT id FROM activities WHERE name = ?',
      [activity_name]
    );
    
    const { lastID } = await db.run(
      'INSERT INTO scans (user_id, activity_id) VALUES (?, ?)',
      [user.id, activity.id]
    );
    
    const scan = await db.get(`
      SELECT 
        a.name as activity_name,
        a.category as activity_category,
        s.scanned_at
      FROM scans s
      JOIN activities a ON s.activity_id = a.id
      WHERE s.id = ?
    `, [lastID]);
    
    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/scans', async (req, res) => {
  try {
    const db = await getDb();
    const { min_frequency, max_frequency, activity_category } = req.query;
    
    let query = `
      SELECT 
        a.name as activity_name,
        a.category as activity_category,
        COUNT(*) as frequency
      FROM scans s
      JOIN activities a ON s.activity_id = a.id
    `;
    
    const whereConditions = [];
    const params = [];
    
    if (activity_category) {
      whereConditions.push('a.category = ?');
      params.push(activity_category);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' GROUP BY a.id';
    
    if (min_frequency) {
      query += ' HAVING frequency >= ?';
      params.push(parseInt(min_frequency));
    }
    
    if (max_frequency) {
      query += query.includes('HAVING') ? ' AND' : ' HAVING';
      query += ' frequency <= ?';
      params.push(parseInt(max_frequency));
    }
    
    const scans = await db.all(query, params);
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});