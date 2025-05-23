import sql from 'mssql';

const config = {
    user: "INDUS",
    password: "Param@99811",
    server: "LAPTOP-G2I0RVJJ",
    database: "Okhla",
    options: {
        trustServerCertificate: true,
        enableArithAbort: true,
        trustedConnection: false,
        instancename: "MSSQLExpress" // optional
    },
    port: 1433
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("✅ MSSQL Pool Connected");
        return pool;
    })
    .catch(err => {
        console.error("❌ MSSQL Connection Failed", err);
        throw err;
    });

export { sql, poolPromise };
