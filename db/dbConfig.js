require("dotenv").config();

module.exports = {
    PGUSER: process.env.POSTGRES_USER,
    PGHOST: process.env.POSTGRES_HOST,
    PGPASSWORD: process.env.POSTGRES_PASSWORD,
    PGDATABASE: process.env.POSTGRES_DATABASE,
    PGPORT: process.env.POSTGRES_PORT,
  };