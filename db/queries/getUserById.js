const db = require('../connection');

const getUserById = (user) => {
  return db.query(`
  SELECT * FROM users
  WHERE id = $1;`, [user.id])
    .then(data => {
      return data.rows[0];
    });
};

exports.getUserById =  getUserById;
