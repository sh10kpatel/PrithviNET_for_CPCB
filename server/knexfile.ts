import type { Knex } from "knex";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: path.resolve(__dirname, process.env.DB_PATH || "./data/prithvinet.db"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, "src/db/migrations"),
      extension: "ts",
    },
    seeds: {
      directory: path.resolve(__dirname, "src/db/seeds"),
      extension: "ts",
    },
  },
  production: {
    client: "better-sqlite3",
    connection: {
      filename: path.resolve(__dirname, process.env.DB_PATH || "./data/prithvinet.db"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, "dist/db/migrations"),
    },
    seeds: {
      directory: path.resolve(__dirname, "dist/db/seeds"),
    },
  },
};

export default config;
