const { Pool } = require("pg");
const dbConfig = require("./dbConfig");

let pool = null;

const initialize = async () => {
  try {
    pool = new Pool({
      user: dbConfig.PGUSER,
      host: dbConfig.PGHOST,
      database: dbConfig.PGDATABASE,
      password: dbConfig.PGPASSWORD,
      port: dbConfig.PGPORT,
    });
    await pool.connect();
    console.log("Database Connected!");
  } catch (error) {
    console.log("Error in database connection: ", error);
    return;
  }
};

const query = async (query, params) => {
  try {
    if (!pool) {
      initialize();
    }
    console.log(query, params);
    const { rows, fields } = await pool.query(query, params);
    console.log("Fetched rows: ", rows);
    if (!rows) {
      return [];
    }
    return rows;
  } catch (err) {
    console.log("Error in query Execution: ", err);
    throw new Error(err);
  }
};

module.exports = {
  initialize: initialize,
  query: query,
};
