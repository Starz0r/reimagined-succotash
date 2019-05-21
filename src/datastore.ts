import { Database } from './database';
import InsertList from './lib/insert-list';
import WhereList from './lib/where-list';
import UpdateList from './lib/update-list';

export interface UserLoginParams {
  id?: number;
  name?: string;
}

export interface Game {
  id?: number;
  name?: string;
  sortname?: string;
  url?: string;
  urlSpdrn?: string;
  author?: string[];
  author_raw?: string;
  collab?: boolean;
  dateCreated?: string;
  adderId?: string;
  removed?: boolean;
  ownerId?: string;
  ownerBio?: string;
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

  async updateUser(user: any, isAdmin: boolean): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('phash2',user.phash2);
    updateList.add('email',user.email);
    updateList.addIf('can_report',user.canReport,isAdmin);
    updateList.addIf('can_submit',user.canSubmit,isAdmin);
    updateList.addIf('can_review',user.canReview,isAdmin);
    updateList.addIf('can_screenshot',user.canScreenshot,isAdmin);
    updateList.add('twitch_link',user.twitchLink);
    updateList.add('nico_link',user.nicoLink);
    updateList.add('youtube_link',user.youtubeLink);
    updateList.add('twitterLink',user.twitterLink);
    updateList.add('bio',user.bio);
    updateList.addIf('banned',user.banned,isAdmin);
    updateList.add('locale',user.locale);
  
    try {
      let params = updateList.getParams();
      params.push(user.id);
      const rows = await database.execute(
        ` UPDATE User ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async updateGame(game: any, isAdmin: boolean): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('removed',game.removed);
  
    try {
      let params = updateList.getParams();
      params.push(game.id);
      const rows = await database.execute(
        ` UPDATE Game ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async addGame(game: Game, adderId: number): Promise<Game> {
    const database = new Database();
    try {
      //const userExists = await database.query(`SELECT 1 FROM User WHERE name = ?`,[username]);
      //if (userExists.length > 0) return false;

      const insertList = new InsertList();
      insertList.add('name',game.name);
      let sortname = game.name || "";
      sortname = sortname.replace("i wanna be the ","");
      sortname = sortname.replace("i wanna ","");
      insertList.add('sortname',sortname);
      insertList.add('url',game.url);
      insertList.add('url_spdrn',game.urlSpdrn);
      insertList.add('author',game.author);
      insertList.add('collab',game.collab?1:0);
      //insertList.add('date_created',);
      insertList.add('adder_id',adderId);
      insertList.add('removed',0);
      insertList.add('owner_id',game.ownerId);
      insertList.add('owner_bio',game.ownerBio);

      const result = await database.execute(
        `INSERT INTO Game ${insertList.getClause()}`, 
        insertList.getParams());

      const g = await this.getGame(result.insertId as number, database);

      if (!g) throw 'game failed to be created';
      return g;
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

  async getReviews(options: any): Promise<any[]> {
    const database = new Database();
    try {
      var isAdmin = false;

      const where = new WhereList();
      where.add('r.game_id',options.game_id);
      where.add('r.user_id',options.user_id);
      where.add('r.id',options.game_id);
      where.addIf('r.removed',0,!isAdmin);

      let params = [];
      if (options.page !== undefined) {
        params.push(options.page);
        params.push(options.limit);
      }
      var query = `
        SELECT r.*, u.name user_name, g.name game_name
        FROM Rating r
        JOIN User u ON r.user_id=u.id
        JOIN Game g on r.game_id=g.id
        ${where.getClause()}
        ORDER BY r.date_created DESC
        ${options.page !== undefined ? ' LIMIT ?,? ' : ''}
      `;

      return await database.query(query, where.getParams().concat(params));
    } finally {
      database.close();
    }
  },

  async getGame(id: number, database?: Database): Promise<Game | null> {
    const doClose = !database;
    const db = database || new Database();
    const query = `
      SELECT g.*
          , AVG(r.rating) AS rating
          , AVG(r.difficulty) AS difficulty 
      FROM Game g 
      LEFT JOIN Rating r ON r.game_id = g.id AND r.removed = 0
      WHERE g.id = ?
    `;
    try {
      const res = await db.query(query, [id]);
      if (!res || res.length == 0) return null;
      return res[0];
    } finally {
      if (doClose) db.close();
    }
  },

  async getRandomGame() {
    const database = new Database();
    try {
      const query = `
        SELECT COUNT(*) AS cnt FROM Game 
        WHERE removed=0 AND url != '' AND url IS NOT NULL
      `;
      const query2 = `
        SELECT id FROM Game 
        WHERE removed=0 AND url != '' AND url IS NOT NULL 
        LIMIT 1 OFFSET ?
      `;
      const rows = await database.query(query)
      const rows2 = await database.query(query2, [Math.floor(+rows[0].cnt * Math.random())]);
      const res = await this.getGame(rows2[0].id, database);
      return res;
    } finally {
      database.close();
    }
  }
}