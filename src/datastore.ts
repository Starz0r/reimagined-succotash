import { Database } from './database';
import InsertList from './lib/insert-list';
import WhereList from './lib/where-list';
import UpdateList from './lib/update-list';
import moment = require('moment');
import { UserLoginParams } from './model/UserLoginParams';
import { Game } from './model/Game';
import { Screenshot } from './model/Screenshot';
import { Review } from './model/Review';
import { List } from './model/List';
import { GetReviewOptions } from './model/GetReviewOptions';
import { GetScreenshotParms } from './model/GetScreenshotParms';
import { GetGamesParms } from './model/GetGamesParms';
import { GetListsParms } from './model/GetListsParms';
import { getTagsParms } from './model/getTagsParms';
import { News } from './model/News';
import { GetNewsParms } from './model/GetNewsParms';
import whitelist from './lib/whitelist';
import { Report } from './model/Report';
import { GetReportParams } from './model/GetReportParams';
import { GetUsersParms } from './model/GetUsersParms';

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

  async updateUser(user: any): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('phash2',user.phash2);
    updateList.add('email',user.email);
    updateList.add('can_report',user.canReport);
    updateList.add('can_submit',user.canSubmit);
    updateList.add('can_review',user.canReview);
    updateList.add('can_screenshot',user.canScreenshot);
    updateList.add('twitch_link',user.twitchLink);
    updateList.add('nico_link',user.nicoLink);
    updateList.add('youtube_link',user.youtubeLink);
    updateList.add('twitterLink',user.twitterLink);
    updateList.add('bio',user.bio);
    updateList.add('banned',user.banned);
    updateList.add('locale',user.locale);
    updateList.add('unsuccessful_logins',user.unsuccessfulLogins);
    updateList.add('last_ip',user.lastIp);
    updateList.add('date_last_login',user.dateLastLogin);
  
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

  async addReport(rpt: Report, adderId: number): Promise<Game> {
    const database = new Database();
    try {
      const insertList = new InsertList();
      insertList.add('type',rpt.type);
      insertList.add('target_id',rpt.targetId);
      insertList.add('report',rpt.report);
      insertList.add('reporter_id',adderId);
      insertList.add('answered_by_id',rpt.answeredById);
      insertList.add('date_answered',rpt.dateAnswered);

      const result = await database.execute(
        `INSERT INTO Report ${insertList.getClause()}`, 
        insertList.getParams());

      const n = await this.getReport(result.insertId as number);
      if (!n) throw 'report failed to be created';
      return n;
    } finally {
      database.close();
    }
  },

  async getReports(params: GetReportParams): Promise<Report[]> {
    const database = new Database();

    const whereList = new WhereList();
    whereList.add("r.id", params.id);
    if (params.answered !== undefined) {
      if (params.answered) whereList.addDirect("r.answered_By_id IS NOT NULL");
      else whereList.addDirect("r.answered_By_id IS NULL");
    }

    whereList.add("r.type",params.type);

    const orderCol = whitelist(params.orderCol,['id','date_created'],'id');
    const orderDir = whitelist(params.orderDir,['ASC','DESC'],'DESC');

    var query = `
      SELECT r.*
      , r.target_id as targetId
      , r.reporter_id as reporterId
      , r.answered_by_id as answeredById
      , r.date_created as dateCreated
      , r.date_answered as dateAnswered
      , u.name as reporterName
      , ua.name as answeredByName
      FROM Report r
      LEFT JOIN User u ON u.id=r.reporter_id
      LEFT JOIN User ua ON ua.id=r.answered_by_id
      ${whereList.getClause()}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ?,?
    `;
    try {
      return await database.execute(query, 
        whereList.getParams().concat(params.page*params.limit,params.limit));
    } finally {
      database.close();
    }
  },

  async getReport(id: number): Promise<Report|null> {
    const reports = await this.getReports({id,page:0,limit:1});
    if (!reports || reports.length == 0) return null;
    return reports[0];
  },

  async updateReport(report: Report): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('answered_by_id',report.answeredById);
    updateList.add('date_answered',report.dateAnswered);

    if (!updateList.hasAny()) return true;
  
    try {
      let params = updateList.getParams();
      params.push(report.id);
      const rows = await database.execute(
        ` UPDATE Report ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async addNews(article: News, adderId: number): Promise<Game> {
    const database = new Database();
    try {
      const insertList = new InsertList();
      insertList.add('poster_id',adderId);
      insertList.add('title',article.title);
      insertList.add('short',article.short);
      insertList.add('news',article.news);
      insertList.add('date_created',article.dateCreated);

      const result = await database.execute(
        `INSERT INTO News ${insertList.getClause()}`, 
        insertList.getParams());

      const n = await this.getNewses({id: result.insertId as number,page:0,limit:1});

      if (!n || n.length == 0) throw 'news failed to be created';
      return n[0];
    } finally {
      database.close();
    }
  },

  async updateNews(article: News): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('title',article.title);
    updateList.add('short',article.short);
    updateList.add('news',article.news);
    if (article.removed!==undefined) {
      updateList.add('removed',article.removed?1:0);
    }

    if (!updateList.hasAny()) return true;
  
    try {
      let params = updateList.getParams();
      params.push(article.id);
      const rows = await database.execute(
        ` UPDATE News ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async getNewses(params: GetNewsParms): Promise<News[]> {
    const database = new Database();

    const whereList = new WhereList();
    whereList.add("n.id", params.id);
    if (params.removed !== undefined) {
      whereList.add("n.removed", params.removed?1:0);
    }

    const orderCol = whitelist(params.orderCol,['id','date_created'],'id');
    const orderDir = whitelist(params.orderDir,['ASC','DESC'],'DESC');

    var query = `
      SELECT n.*, n.poster_id as posterId, n.date_created as dateCreated
      FROM News n
      ${whereList.getClause()}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ?,?
    `;
    try {
      return await database.execute(query, 
        whereList.getParams().concat(params.page*params.limit,params.limit));
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

  async getLists(params: GetListsParms): Promise<any[]> {
    const database = new Database();

    const whereList = new WhereList();
    whereList.add("l.user_id", params.userId);
    whereList.add("l.game_id", params.gameId);

    var query = `
      SELECT *
      FROM List l
      JOIN ListGame g on g.list_id = l.id
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
        params.push(options.page*options.limit!);
        params.push(options.limit);
      }

      var query = `
        SELECT r.*, 
        u.name user_name,
        u.id AS uid, 
        g.name game_name,
        g.id AS game_id,
        COUNT(l.id) AS like_count,
        r.user_id = g.owner_id AS owner_review,
        r.user_id as userId,
        r.game_id as gameId
        FROM Rating r
        JOIN User u ON r.user_id=u.id
        JOIN Game g on r.game_id=g.id
        LEFT JOIN LikeReview AS l ON l.rating_id = r.id
        ${where.getClause()}
        GROUP BY r.id
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
      await database.execute(
        `DELETE FROM Rating WHERE game_id=? AND user_id=?`, 
        [gameId,userId]);

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

  async updateReview(review: any): Promise<boolean> {
    const database = new Database();
  
    const updateList = new UpdateList();
  
    updateList.add('removed',review.removed?1:0);
    updateList.add('rating',review.rating);
    updateList.add('difficulty',review.difficulty);
    updateList.add('comment',review.comment);

    if (!updateList.hasAny()) return true;
  
    try {
      let params = updateList.getParams();
      params.push(review.id);
      const rows = await database.execute(
        ` UPDATE Rating ${updateList.getSetClause()} WHERE id = ?`,params);
      return (rows.affectedRows == 1);
    } finally {
      database.close();
    }
  },

  async addLikeToReview(reviewId: number, userId: number): Promise<boolean> {
    const database = new Database();
  
    try {
      await database.execute(
        ` INSERT IGNORE INTO LikeReview (rating_id, user_id) VALUES (?,?)`,
        [reviewId,userId]);
      return true;
    } finally {
      database.close();
    }
  },

  async removeLikeFromReview(reviewId: number, userId: number): Promise<boolean> {
    const database = new Database();
  
    try {
      await database.execute(
        ` DELETE FROM LikeReview WHERE rating_id = ? AND user_id = ?`,
        [reviewId,userId]);
      return true;
    } finally {
      database.close();
    }
  },

  async addFollowToUser(targetUserId: number, userId: number): Promise<boolean> {
    const database = new Database();
  
    try {
      await database.execute(
        ` INSERT IGNORE INTO UserFollow (user_id, user_follow_id) VALUES (?,?)`,
        [targetUserId,userId]);
      return true;
    } finally {
      database.close();
    }
  },

  async removeFollowFromUser(targetUserId: number, userId: number): Promise<boolean> {
    const database = new Database();
  
    try {
      await database.execute(
        ` DELETE FROM UserFollow WHERE user_id = ? AND user_follow_id = ?`,
        [targetUserId,userId]);
      return true;
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
    whereList.add("g.id",params.id);
    whereList.addIf("g.removed",params.removed?1:0,params.removed!==undefined);

    if (params.q !== undefined) {
      whereList.addPhrase("g.name LIKE ? OR g.author LIKE ?",'%'+params.q+'%','%'+params.q+'%');
    }

    if (params.name !== undefined) {
      whereList.add2("g.name LIKE ?",'%'+params.name+'%');
    }

    whereList.add("g.owner_id",params.ownerUserId);

    if (params.author !== undefined) {
      whereList.add2("g.author LIKE ?",'%'+params.author+'%');
    }

    if (params.hasDownload!==undefined) {
      if (params.hasDownload) whereList.addDirect("g.url is not null AND g.url != ''");
      else whereList.addDirect("g.url is null OR g.url != ''");
    }

    whereList.add("g.date_created >= ?",params.createdFrom);
    whereList.add("g.date_created <= ?",params.createdTo);

    if (params.reviewedByUserId !== undefined) {
      whereList.add2(
        "g.id IN (SELECT game_id FROM Rating WHERE removed = 0 AND user_id = ?)",
        params.reviewedByUserId);
    }
    //TODO: cleared

    whereList.addIn("gt.name",params.tags);
    if (params.tags!==undefined) {
      whereList.addDirect(`g.id IN (
          SELECT game_id 
          FROM GameTag gt 
          JOIN Tag t ON t.id=gt.tag_id 
          WHERE t.name IN (${params.tags.map(s=>"?").join(',')})
        )`);
    }
    
    const havingList = new WhereList("HAVING");
    if (params.ratingFrom !== undefined) 
    havingList.add2("rating >= ?",params.ratingFrom);
    if (params.ratingTo !== undefined)
    havingList.add2("rating <= ?",params.ratingTo);
    if (params.difficultyFrom !== undefined) 
    havingList.add2("difficulty >= ?",params.difficultyFrom);
    if (params.difficultyTo !== undefined) 
    havingList.add2("difficulty <= ?",params.difficultyTo);

    const query = `
      SELECT g.*,
      AVG(r.rating) AS rating,
      AVG(r.difficulty) AS difficulty,
      COUNT(r.id) AS rating_count
      FROM Game g
      LEFT JOIN Rating r ON r.removed=0 AND r.game_id=g.id
      LEFT JOIN User AS u ON u.id = r.user_id AND u.banned = 0
      ${whereList.getClause()}
      GROUP BY g.id
      ${havingList.getClause()}
      ORDER BY ${params.orderCol || 'date_created'} ${params.orderDir || 'ASC'}
      LIMIT ?,?
    `;
    //console.log(query);
    //console.log(whereList.getParams());
    //WHERE gg.removed = 0 AND gg.url IS NOT NULL and gg.url != '' FOR TOP 10 LATEST
    try {
      const rows = await database.query(query,
        whereList.getParams()
          .concat(havingList.getParams())
          .concat([params.page*params.limit,params.limit]));
      rows.forEach(game => {
        if (!moment(game.date_created).isValid()) game.date_created = null;
        if (game.collab == 1) game.author = game.author.split(" ");
        else game.author = [game.author];
      });
      return rows;
    } finally {
      database.close();
    }
  },

  async getUser(id: number): Promise<any> {
    const users = await this.getUsers({id,page:0,limit:1});
    if (!users || users.length == 0) return null;
    return users[0];
  },

  async getUsers(params: GetUsersParms): Promise<any[]> {
    const database = new Database();

    const whereList = new WhereList();
    whereList.add("u.id",params.id);
    if (params.followerUserId !== undefined) {
      whereList.add2("u.id IN (SELECT user_follow_id FROM UserFollow WHERE user_id = ?)",params.followerUserId);
    }
    if (params.banned !== undefined) {
      if (!params.banned) whereList.add("u.banned",0)
      else whereList.add("u.banned",1)
    }
    
    const orderCol = whitelist(params.orderCol,['id','date_created'],'id');
    const orderDir = whitelist(params.orderDir,['ASC','DESC'],'DESC');

    const query = `
      SELECT u.id, u.name, u.date_created as dateCreated
      , u.twitch_link as twitchLink, u.youtube_link as youtubeLink
      , u.nico_link as nicoLink, u.twitter_link as twitterLink
      , u.bio, u.is_admin as isAdmin, u.email

      ,u.can_report as canReport
      ,u.can_submit as canSubmit
      ,u.can_review as canReview
      ,u.can_screenshot as canScreenshot
      ,u.banned as banned

      FROM User u
      ${whereList.getClause()}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ?,?
    `;
    try {
      const rows = await database.query(query,
        whereList.getParams()
        .concat([params.page*params.limit,params.limit])
      );
      rows.forEach(u => {u.isAdmin = (u.isAdmin===1);})
      return rows;
    } finally {
      database.close();
    }
  }
}