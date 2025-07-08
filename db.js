// db.js
import sql from 'mssql';

const config = {
  user: "Indus",
  password: "Param@99811",
  server: "157.20.215.187",
  database: "OkhlaTest",
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    instancename: "sqlExpress"
},
  port: 1433
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to MSSQL Database");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err);
  });

export { sql, poolPromise };
