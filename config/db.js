const mysql = require("mysql2");
require("dotenv").config();

const isTiDB = Boolean(process.env.DB_HOST && process.env.DB_HOST.includes("tidbcloud.com"));
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : (isTiDB ? 4000 : 3306);
const ssl = (process.env.DB_SSL === "true" || isTiDB) ? { rejectUnauthorized: false } : undefined;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((error, connection) => {
  if (error) {
    console.log("Database connection failed:", error.message);
  } else {
    console.log("MySQL connected successfully via connection pool");
    connection.release();
  }
});

module.exports = db;
