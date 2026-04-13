const pool = require('../config/db');

// ------------------------------
// GET all users
// ------------------------------
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.user_id,
        u.username,
        u.email,
        r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching Users Data: ', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ------------------------------
// GET user by ID (UUID)
// ------------------------------
exports.getUserById = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         u.id,
         u.user_id,
         u.username,
         u.email,
         r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.user_id = $1`,
      [user_id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// ------------------------------
// UPDATE user
// ------------------------------
exports.updateUser = async (req, res) => {
  const { user_id } = req.params;
  const { username, email, role_id } = req.body;

  if (!username || !email || !role_id) {
    return res.status(400).json({ error: 'Username, email, and role_id are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2, role_id = $3
       WHERE user_id = $4
       RETURNING id, user_id, username, email, role_id`,
      [username, email, role_id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// ------------------------------
// DELETE user
// ------------------------------
exports.deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING *',
      [user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'User deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
