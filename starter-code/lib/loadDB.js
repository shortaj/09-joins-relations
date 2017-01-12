'use strict'

const Promise = require('bluebird')
const fsProm = Promise.promisifyAll(require('fs'))
const pg = require('pg')
const Pool = pg.Pool
const ops = module.exports = {}

const pool = new Pool({
  user: process.env.USER,
  password: '',
  host: 'localhost',
  database: process.env.USER,
  max: 10,
  idleTimeoutMillis: 1000
})

pool.on('error', e => console.error(e))

function SQL(parts, ...values) {
  return {
    text: parts.reduce((prev, curr, i) => `${prev}$${i}${curr}`),
    values
  };
}

const getAuthorId = function(record) {
  return new Promise((res, rej) => {
    res(
      pool.query(SQL`SELECT author_id FROM authors WHERE author=${record.author}`)
      .then(id => {
        record.id = id.rows[0].author_id
        return record
      })
    )
    .catch(err => rej(err))
  })
}

const loadRecordArticle = function(record) {
  return new Promise((res, rej) => {
    res(pool.query(SQL`INSERT INTO
                       articles(author_id, title, category, "publishedOn", body)
                       VALUES(${record.id}, ${record.title}, ${record.category}, ${record.publishedOn}, ${record.body})`))
    .catch(err => rej(err))
  })
}

const loadRecordAuthor = function(record) {
  return new Promise((res, rej) => {
    res(pool.query(SQL`INSERT INTO
                       authors(author, "authorUrl")
                       VALUES(${record.author}, ${record.authorUrl})
                       ON CONFLICT DO NOTHING;`))
    .catch(err => rej(err))
  })
}

ops.createTableArticle = function() {
  return new Promise((res, rej) => {
    const sqlCreate = `
      CREATE TABLE IF NOT EXISTS
      articles (
        article_id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES authors(author_id),
        title VARCHAR(255) NOT NULL,
        category VARCHAR(20),
        "publishedOn" DATE,
        body TEXT NOT NULL
      );`

    res(
      pool.query(sqlCreate)
      .then(() => console.log('create articles success'))
      .catch(err => rej(err))
    )
  })
}

ops.createTableAuthor = function() {
  return new Promise((res, rej) => {
    const sqlCreate = `
      CREATE TABLE IF NOT EXISTS
      authors (
        author_id SERIAL PRIMARY KEY,
        author VARCHAR(255) UNIQUE NOT NULL,
        "authorUrl" VARCHAR (255)
      );`

    res(
      pool.query(sqlCreate)
      .then(() => console.log('create authors success'))
      .catch(err => rej(err))
    )
  })
}

ops.loadAuthors = (file) => {
  return fsProm.readFileAsync(`${__dirname}/../public/data/${file}`)
  .then(data => JSON.parse(data.toString().trim()))
  .then(fd => fd.map(loadRecordAuthor))
  .then(proms => Promise.all(proms))
  .then(() => console.log('authors loaded successfully'))
  .catch(err => console.error(err))
}

ops.loadArticles = (file) => {
  return fsProm.readFileAsync(`${__dirname}/../public/data/${file}`)
  .then(data => JSON.parse(data.toString().trim()))
  .then(records => records.map(getAuthorId))
  .then(proms => Promise.all(proms))
  .then(records => records.map(loadRecordArticle))
  .then(proms => Promise.all(proms))
  .then(() => console.log('articles loaded successfully'))
  .catch(err => console.error(err))
}
