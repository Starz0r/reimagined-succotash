import axios from 'axios';
import chai from 'chai';
import { Database } from '../database';
import FormData from 'form-data';
import fs from 'fs';
import config from '../config/config';

var expect = chai.expect;
var fail = chai.assert.fail;

export interface TestUser {
    token: string;
    id: number;
    username: string;
    password: string;
    email: string;
}

export async function createUser(isAdmin: boolean): Promise<TestUser> {
    const usernameA = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    //register
    const reg = await axios.post('http://localhost:4201/api/users',
        { username: usernameA, password: "test-pw", email: "test@example.com" });
    expect(reg).to.have.property('status').and.equal(200);
    expect(reg).to.have.property('data');
    expect(reg.data).to.have.property('token').and.be.a('string');
    expect(reg.data).to.have.property('id').and.be.a('number');

    if (isAdmin) {
        const db = new Database({
            host: 'localhost',
            port: 33061, //see docker-compose.yaml
            database: config.db_database,
            user: config.db_user,
            password: config.db_password,
            timeout:1000
          });
        try {
            const success = await db.execute('update User set is_admin = 1 WHERE id = ?', [reg.data.id]);
            expect(success.affectedRows).to.be.equal(1);
        } catch (err) {
            fail("failed to connect to database!\n"+err);
        } finally {
            try { 
                await db.close();
            } catch (err) {
                fail("failed to close database!\n"+err);
            }
        }
    }

    //login
    const login = await axios.post('http://localhost:4201/api/auth/login',
        { username: usernameA, password: "test-pw" });
    expect(login).to.have.property('status').and.equal(200);
    expect(login).to.have.property('data');
    expect(login.data).to.have.property('token').and.be.a('string');

    return { 
        token: login.data.token, 
        id: login.data.id, 
        username: usernameA, 
        password: "test-pw", 
        email: "test@example.com" 
    };
}

export async function createGame(parameters?: any): Promise<any> {
    const user = await createUser(true);

    //create game
    const rsp = await axios.post('http://localhost:4201/api/games',
        {
            name: "i wanna " + user.username,
            author: user.username,
            ...parameters
        },
        { headers: { 'Authorization': "Bearer " + user.token } });
    expect(rsp).to.have.property('status').and.equal(200);
    expect(rsp).to.have.property('data');
    expect(rsp.data).to.have.property('id').and.be.a("number");

    return { id: rsp.data.id, name: rsp.data.name, user };
}

export async function addScreenshot(user: TestUser, game: any): Promise<any> {
    let data = new FormData();

    data.append('description', 'super neat screenshot');
    data.append('screenshot', fs.createReadStream(__dirname+'/HYPE.png'));

    const hd = data.getHeaders();
    hd['Authorization'] = "Bearer " + user.token;

    const upd = await axios.post(`http://localhost:4201/api/games/${game.id}/screenshots`,
      data,
      {headers: hd});
    expect(upd).to.have.property('status').and.equal(200);
    expect(upd).to.have.property('data');
    expect(upd.data).to.have.property('id').and.be.a('number');
    return upd.data;
}

export async function addReview(user: TestUser, game: any): Promise<any> {
    //review game
    const upd = await axios.put(`http://localhost:4201/api/games/${game.id}/reviews`,
      {
        rating: 69,
        difficulty: 50,
        comment: 'good game very good'
      },
      {headers: {'Authorization': "Bearer " + user.token}});
    expect(upd).to.have.property('status').and.equal(200);
    expect(upd).to.have.property('data');
    expect(upd.data).to.have.property('id').and.be.a('number');
    
    return upd.data;
}

export async function addTag(user: TestUser): Promise<any> {
    const nm = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const tres = await axios.post('http://localhost:4201/api/tags',
      {name:nm},
      {headers: {'Authorization': "Bearer " + user.token}});
    expect(tres).to.have.property('status').and.equal(200);

    return tres.data;
}

export function getConTest(ctx: Mocha.Context): Mocha.HookFunction {
    return () => axios.get('http://localhost:4201/api/ping')
    .then(ctx.done)
    .catch((_: Error) => {
      ctx.done(new Error('server not responding at http://localhost:4201/api, is it online?'));
    });
  }
  

export async function setUserToken(user: TestUser, token: string): Promise<any> {
    const database = new Database({
        host: 'localhost',
        port: 33061, //see docker-compose.yaml
        database: config.db_database,
        user: config.db_user,
        password: config.db_password,
        timeout:1000
      });
    try {
        const success = await database.execute(
            `UPDATE User SET reset_token = ?, reset_token_set_time = CURRENT_TIMESTAMP
            WHERE id = ?`,[token,user.id]);
        expect(success.affectedRows).to.be.equal(1);
    } catch (err) {
        console.log("failed to connecto to database!\n"+err);
        fail("failed to connecto to database!\n"+err);
    } finally {
        try { 
            await database.close();
        } catch (err) {
            console.log("failed to close database!\n"+err);
        }
    }
}