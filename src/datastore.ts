import { Database } from './database';
import InsertList from './lib/insert-list';
import WhereList from './lib/where-list';
import UpdateList from './lib/update-list';
import moment = require('moment');
import { getPackedSettings } from 'http2';

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

export interface Screenshot {
  id?: number;
  gameId?: number;
  addedById?: number;
  approvedById?: number;
  description?: string;
  approved?: boolean;
  dateCreated?: string;
  removed?: boolean;
}

export interface Review {
  id?: number;
  userId?: number;
  gameId?: number;
  rating?: number;
  difficulty?: number;
  comment?: string;
  date_created?: string;
  removed?: boolean;
}

export interface List {
  id?: number;
  userId?: number;
  name?: string;
  description?: string;
  private?: boolean
}

export interface GetReviewOptions {
  game_id?: number;
  user_id?: number;
  id?: number;
  page?: number;
  limit?: number;
  textReviewsFirst?: boolean;
}

export interface GetScreenshotParms {
  gameId?: number;
  removed?: boolean;
  approved?: boolean;
  page: number;
  limit: number;
  id?: number;
}

export interface GetGamesParms {
  page: number;
  limit: number;
  name?: string;
  removed?: boolean;

  orderCol?: string;
  orderDir?: "ASC"|"DESC";
}

export interface GetListsParms {
  page: number;
  limit: number;
  userId?: number;
  gameId?: number;

  orderCol?: string;
  orderDir?: "ASC"|"DESC";
}

export interface getTagsParms {
  gameId?: number;
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

  async updateGame(game: Game, isAdmin: boolean): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.addIf('removed',game.removed?1:0,game.removed !== undefined);
    updateList.add('name',game.name);
    updateList.add('url',game.url);
    updateList.add('urlSpdrn',game.urlSpdrn);
    if (game.author) {
      updateList.add('author',game.author.join(' '));
    }
    updateList.add('date_created',game.dateCreated);
    updateList.add('owner_id',game.ownerId);
    updateList.add('owner_bio',game.ownerBio);
  
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
           , u.bio, u.email, u.is_admin
      FROM User u 
      WHERE u.id = ? ${removedClause}
    `;
    try {
      const rows = await database.query(query,[id]);
      if (rows.length == 0) return null;

      rows[0].isAdmin = (rows[0].is_admin===1);
      delete rows[0].is_admin;

      return rows[0];
    } finally {
      database.close();
    }
  },

  async getLists(params: GetListsParms): Promise<any[]> {
    const database = new Database();

    const whereList = new WhereList();
    whereList.add("l.user_id", params.userId);
    whereList.add("l.game_id", params.gameId);

    var query = `
      SELECT l.list_id, l.game_id, n.list_name
      FROM lists l
      JOIN LIST_NAMES n ON n.list_id=l.list_id
      ${whereList.getClause()}
    `;
    try {
      return await database.execute(query, whereList.getParams());
    } finally {
      database.close();
    }
  },

  async getReviews(options: GetReviewOptions): Promise<any[]> {
    const database = new Database();
    try {
      var isAdmin = false;

      const where = new WhereList();
      where.add('r.game_id',options.game_id);
      where.add('r.user_id',options.user_id);
      where.add('r.id',options.id);
      where.addIf('r.removed',0,!isAdmin); //TODO: allow admin to toggle
      where.addIf('u.banned',0,!isAdmin); //TODO: allow admin to toggle
      where.addIf('g.removed',0,!isAdmin); //TODO: allow admin to toggle

      let params = [];
      if (options.page !== undefined) {
        params.push(options.page);
        params.push(options.limit);
      }

      var query = `
        SELECT r.*, 
        u.name user_name,
        u.id AS uid, 
        g.name game_name,
        g.id AS game_id,
        COUNT(l.id) AS like_count,
        r.user_id = g.owner_id AS owner_review
        FROM Rating r
        JOIN User u ON r.user_id=u.id
        JOIN Game g on r.game_id=g.id
        LEFT JOIN LikeReview AS l ON l.rating_id = r.id
        ${where.getClause()}
        ${options.textReviewsFirst
          ?`	CASE WHEN (r.comment IS NULL OR r.comment='') THEN 0 ELSE 1 END DESC, 
              COUNT(l.id) DESC,
              r.date_created DESC`
          :'ORDER BY r.date_created DESC'}
        ${options.page !== undefined ? ' LIMIT ?,? ' : ''}
      `;

      return await database.query(query, where.getParams().concat(params));
    } finally {
      database.close();
    }
  },

  async addReview(review: Review, gameId: number, userId: number): Promise<Review> {
    const database = new Database();
    try {
      const insertList = new InsertList();
      insertList.add('game_id',gameId);
      insertList.add('user_id',userId);
      insertList.add('rating',review.rating);
      insertList.add('difficulty',review.difficulty);
      insertList.add('comment',review.comment);

      const result = await database.execute(
        `INSERT INTO Rating ${insertList.getClause()}`, 
        insertList.getParams());

      const r = await this.getReview(result.insertId as number);

      if (!r) throw 'rating failed to be created';
      return r;
    } finally {
      database.close();
    }
  },

  async addList(list: List, userId: number): Promise<List> {
    const database = new Database();
    try {
      const insertList = new InsertList();
      insertList.add('name',list.name);
      insertList.add('user_id',userId);
      insertList.add('description',list.description);
      insertList.addIf('private',list.private?1:0,list.private!==undefined);

      const result = await database.execute(
        `INSERT INTO List ${insertList.getClause()}`, 
        insertList.getParams());

      const l = await this.getList(result.insertId as number);

      if (!l) throw 'list failed to be created';
      return l;
    } finally {
      database.close();
    }
  },

  async getList(id: number): Promise<List|null> {
    //TODO: single pattern
    const database = new Database();
    try {
      let where = new WhereList();
      where.add('l.id',id);

      const lists = await database.query(`
        SELECT *, l.user_id as userId
        FROM List l
        ${where.getClause()}
      `, where.getParams());
      if (!lists || lists.length == 0) return null;
      const list = lists[0] as List;

      return list;
    } finally {
      database.close();
    }
  },

  async getListGames(id: number): Promise<any[]> {
    const database = new Database();
    try {
      let where = new WhereList();
      where.add('lg.list_id',id);

      return await database.query(`
        SELECT lg.game_id
        FROM ListGame lg
        ${where.getClause()}
      `, where.getParams());
    } finally {
      database.close();
    }
  },

  async addGameToList(listId: number, gameId: number): Promise<boolean> {
    const database = new Database();
    try {
      let ins = new InsertList();
      ins.add('list_id',listId);
      ins.add('game_id',gameId);

      await database.execute(
        `INSERT INTO ListGame ${ins.getClause()}`, 
        ins.getParams());
      return true;
    } finally {
      database.close();
    }
  },

  async getReview(reviewId: number): Promise<Review|null> {
    const rows = await this.getReviews({id: reviewId});
    if (!rows || rows.length == 0) return null;
    return rows[0];
  },

  async getGame(id: number, database?: Database): Promise<Game | null> {
    const doClose = !database;
    const db = database || new Database();
    const query = `
      SELECT g.*, g.author as author_raw
          , AVG(r.rating) AS rating
          , AVG(r.difficulty) AS difficulty 
      FROM Game g 
      LEFT JOIN Rating r ON r.game_id = g.id AND r.removed = 0
      WHERE g.id = ?
    `;
    try {
      const res = await db.query(query, [id]);
      if (!res || res.length == 0) return null;

      const game = res[0];
      //if zero date, we don't have it, so null it out
      if (!moment(game.dateCreated).isValid()) game.dateCreated = undefined;
      if (game.collab && game.author_raw) game.author = (game.author_raw).split(" ");
      else game.author = game.author_raw?[game.author_raw]:[];
      delete game.author_raw;

      return game;
    } finally {
      if (doClose) db.close();
    }
  },

  async gameExists(id: number): Promise<boolean> {
    const db = new Database();
    try {
      const res = await db.query(
        'SELECT 1 FROM Game g WHERE g.id = ? AND g.removed = 0', [id]);
      return (res && res.length == 1);
    } finally {
      db.close();
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
  },

  async getScreenshots(params: GetScreenshotParms): Promise<Screenshot[]> {
    const whereList = new WhereList();
    whereList.add("s.id",params.id);
    whereList.add("s.game_id",params.gameId);
    whereList.addIf("s.approved",params.approved?1:0,params.approved!==undefined);
    whereList.addIf("s.removed",params.removed?1:0,params.removed!==undefined);
    
    var query = `
      SELECT s.*, u.name user_name, g.name game_name
      , s.game_id as gameId
      , s.added_by_id as addedById
      FROM Screenshot s
      JOIN User u ON s.added_by_id=u.id
      JOIN Game g on s.game_id=g.id
      ${whereList.getClause()}
      ORDER BY s.date_created DESC
    `;
    const database = new Database();
    try {
      const rows = await database.query(query,whereList.getParams());
      rows.forEach(r => {
        if (r.approved !== null) r.approved = r.approved==1;
        if (r.removed !== null) r.removed = r.removed==1;
      });
      return rows;
    } finally {
      database.close();
    }
  },

  async getScreenshot(id: number): Promise<Screenshot|null> {
    const screenshots = await this.getScreenshots({id,page:0,limit:1});
    if (!screenshots || screenshots.length == 0) return null;
    return screenshots[0];
  },

  async updateScreenshot(ss: Screenshot, isAdmin: boolean): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.addIf('removed',ss.removed?1:0,ss.removed !== undefined);
    updateList.addIf('approved',ss.approved?1:0,ss.approved !== undefined);
    
    if (!updateList.hasAny()) return true;

    try {
      let params = updateList.getParams();
      params.push(ss.id);
      const rows = await database.execute(
        ` UPDATE Screenshot ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async addScreenshot(ss: Screenshot, adderId: number): Promise<Screenshot> {
    const database = new Database();
    try {
      //const userExists = await database.query(`SELECT 1 FROM User WHERE name = ?`,[username]);
      //if (userExists.length > 0) return false;

      const insertList = new InsertList();
      insertList.add('game_id',ss.gameId);
      insertList.add('added_by_id',adderId);
      insertList.add('description',ss.description);

      const result = await database.execute(
        `INSERT INTO Screenshot ${insertList.getClause()}`, 
        insertList.getParams());
        
      const g = await this.getScreenshot(result.insertId as number);

      if (!g) throw 'screenshot failed to be created';
      return g;
    } finally {
      database.close();
    }
  },

  async getTags(params: getTagsParms) {

    const whereList = new WhereList();
    whereList.add('gt.game_id',params.gameId);

    var query = `
      SELECT gt.*, t.name, t.id
      FROM GameTag gt
      JOIN Game g on g.id = gt.game_id AND g.removed = 0
      INNER JOIN Rating AS r ON r.user_id = gt.user_id AND r.game_id = gt.game_id AND r.removed=0
      JOIN Tag t on t.id = gt.tag_id
      ${whereList.getClause()}
    `;

    const database = new Database();
    try {
      return await database.query(query,whereList.getParams());
    } finally {
      database.close();
    }
  },

  async getGames(params: GetGamesParms) {
    const database = new Database();

    const whereList = new WhereList();
    whereList.addIf("g.removed",params.removed?1:0,params.removed!==undefined);
    if (params.name !== undefined) {
      whereList.addPhrase("g.name LIKE ?",'%'+params.name+'%');
    }

    const query = `
      SELECT g.*,
      AVG(case when u.banned = 1 THEN NULL else r.rating end) AS rating,
      AVG(case when u.banned = 1 THEN NULL ELSE r.difficulty END) AS difficulty,
      COUNT(case when u.banned = 0 THEN r.id END) AS rating_count
      FROM Game g
      LEFT JOIN Rating r ON r.removed=0 AND r.game_id=g.id
      LEFT JOIN User AS u ON u.id = r.user_id
      ${whereList.getClause()}
      GROUP BY g.id
      ORDER BY ${params.orderCol || 'date_created'} ${params.orderDir || 'ASC'}
      LIMIT ?,?
    `;
    //WHERE gg.removed = 0 AND gg.url IS NOT NULL and gg.url != '' FOR TOP 10 LATEST
    try {
      const rows = await database.query(query,
        whereList.getParams().concat([params.page*params.limit,params.limit]));
      rows.forEach(game => {
        if (!moment(game.date_created).isValid()) game.date_created = null;
        if (game.collab == 1) game.author = game.author.split(" ");
        else game.author = [game.author];
      });
      return rows;
    } finally {
      database.close();
    }
  }
}