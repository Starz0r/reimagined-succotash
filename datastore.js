const Database = require('./database');

module.exports = {
 getLists(uid,gid,callback,err_cb) {
    const database = new Database();
    var query = `
      SELECT l.list_id, l.game_id, n.list_name
      FROM lists l
      JOIN LIST_NAMES n ON n.list_id=l.list_id
      WHERE l.user_id=?
      AND l.game_id=?
    `;
    database.query(query,[uid,gid])
      .then(callback)
      .then(() => database.close())
      .catch(err => {
        console.log(err);
        database.close();
        if (err_cb) err_cb(err);
      });
  },
  
  getReviews(options, callback, err_cb) {
    const database = new Database();
    const params = [];
    let where = '';
    if (options.game_id) {
      params.push(options.game_id);
    }
    if (options.user_id) {
      params.push(options.user_id);
    }
    if (options.id) {
      params.push(options.id);
    }
    if (options.page !== undefined) {
      params.push(options.page);
      params.push(options.limit);
    }
    var isAdmin = false;
    var query = `
      SELECT r.*, u.name user_name, g.name game_name
      FROM rating r
      JOIN user u ON r.user_id=u.id
      JOIN game g on r.game_id=g.id
      WHERE 1=1
      ${options.game_id?' AND r.game_id = ? ':''}
      ${options.user_id?' AND r.user_id = ? ':''}
      ${options.id?' AND r.id = ? ':''}
      ${isAdmin?'':' AND r.removed=0 '}
      ORDER BY r.date_created DESC
      ${options.page!==undefined?' LIMIT ?,? ':''}
    `;
    database.query(query,params)
      .then(callback)
      .then(() => database.close())
      .catch(err => {
        console.log(err);
        database.close();
        if (err_cb) err_cb(err);
      });
  },

  getGame(id,callback,err_cb,database) {
    database = database || new Database();
    query = `
      SELECT g.*
           , AVG(r.rating) AS rating
           , AVG(r.difficulty) AS difficulty 
      FROM game g 
      JOIN rating r ON r.game_id = g.id AND r.removed = 0
      WHERE g.id = ?
    `;
    database.query(query,[id])
      .then(callback)
      .then(() => database.close())
      .catch(err => {
        console.log(err);
        database.close();
        if (err_cb) err_cb(err);
      });
  },
  
  getRandomGame(callback, err_cb) {
    const database = new Database();
    query = `
      SELECT COUNT(*) AS cnt FROM Game 
      WHERE removed=0 AND url != '' AND url IS NOT NULL
    `;
    query2 = `
      SELECT id FROM Game 
      WHERE removed=0 AND url != '' AND url IS NOT NULL 
      LIMIT 1 OFFSET ?
    `;
    database.query(query)
      .then(rows => database.query(query2,[Math.floor(+rows[0].cnt*Math.random())]))
      .then(rows => this.getGame(rows[0].id,callback,err_cb,database));
  }
}