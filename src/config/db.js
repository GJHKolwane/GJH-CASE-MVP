import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
user: "postgres",
host: "127.0.0.1",
database: "gjhdb",
password: "postgres",
port: 5432,
});

export const query = (text, params) => pool.query(text, params);

export default pool;
