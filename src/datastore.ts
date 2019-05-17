import { Database } from './database';

export interface UserLoginParams {
  id?: number;
  name?: string;
}

export default {
  /**
   * return user if user was created
   */
  async addUser(username: string,password: string,email: string): Promise<any> {
    const database = new Database();
    try {
      const userExists = await database.query(`SELECT 1 FROM User WHERE name = ?`,[username]);
      if (userExists.length > 0) return false;

      const result = await database.execute(`
      INSERT INTO User (name, phash2, email) 
      VALUES ( ?, ?, ? )
      `, [username,password,email]);

      return this.getUser(result.insertId as number);
    } finally {
      database.close();
    }
  },

  async getUserForLogin(params: UserLoginParams): Promise<any> {
    const database = new Database();
    let query = `SELECT id,name,phash2 FROM User WHERE`;
    let qparams = [];
    if (params.id != undefined) {
      query += ` id = ? `;
      qparams.push(params.id);
    }
    if (params.name != undefined) {
      query += ` name = ? `;
      qparams.push(params.name);
    }
    const users = await database.query(query,qparams);
    if (users.length == 0) {
      return null;
    }
    return users[0];
  },

  async getUser(id: number): Promise<any> {
    const database = new Database();
    const isAdmin = false;
    const removedClause = isAdmin?'':'AND banned = 0';
    const query = `
      SELECT u.id, u.name, u.date_created
           , u.twitch_link, u.youtube_link
           , u.nico_link, u.twitter_link
           , u.bio, u.email
      FROM User u 
      WHERE u.id = ? ${removedClause}
    `;
    try {
      const rows = await database.query(query,[id]);
      if (rows.length == 0) return null;
      else return rows[0];
    } finally {
      database.close();
    }
  },

  async getLists(uid: number, gid: number): Promise<any[]> {
    const database = new Database();
    var query = `
      SELECT l.list_id, l.game_id, n.list_name
      FROM lists l
      JOIN LIST_NAMES n ON n.list_id=l.list_id
      WHERE l.user_id=?
      AND l.game_id=?
    `;
    try {
      return await database.execute(query, [uid,gid]);
    } finally {
      database.close();
    }
  },

  getReviews(options: any): Promise<any[]> {
    return new Promise((res,rej)=>{
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
      ${options.game_id ? ' AND r.game_id = ? ' : ''}
      ${options.user_id ? ' AND r.user_id = ? ' : ''}
      ${options.id ? ' AND r.id = ? ' : ''}
      ${isAdmin ? '' : ' AND r.removed=0 '}
      ORDER BY r.date_created DESC
      ${options.page !== undefined ? ' LIMIT ?,? ' : ''}
    `;
    database.query(query, params)
      .then(res)
      .then(() => database.close())
      .catch(err => {
        database.close();
        rej(err);
      });
    });
  },

  getGame(id: number, database?: Database) {
    return new Promise((res,rej) => {
      const db = database || new Database();
      const query = `
        SELECT g.*
            , AVG(r.rating) AS rating
            , AVG(r.difficulty) AS difficulty 
        FROM game g 
        JOIN rating r ON r.game_id = g.id AND r.removed = 0
        WHERE g.id = ?
      `;
      db.query(query, [id])
        .then(res)
        .then(() => db.close())
        .catch(err => {
          db.close();
          rej(err);
        });
    });
  },

  getRandomGame() {
    return new Promise((res,rej)=>{
      const database = new Database();
      const query = `
        SELECT COUNT(*) AS cnt FROM Game 
        WHERE removed=0 AND url != '' AND url IS NOT NULL
      `;
      const query2 = `
        SELECT id FROM Game 
        WHERE removed=0 AND url != '' AND url IS NOT NULL 
        LIMIT 1 OFFSET ?
      `;
      database.query(query)
        .then(rows => database.query(query2, [Math.floor(+rows[0].cnt * Math.random())]))
        .then(rows => this.getGame(rows[0].id, database).then(res).catch(rej));
    });
  }
}