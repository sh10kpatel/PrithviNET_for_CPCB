import knex from "knex";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const db = knex({
  client: "better-sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../../", process.env.DB_PATH || "./data/prithvinet.db"),
  },
  useNullAsDefault: true,
});

export { db };
