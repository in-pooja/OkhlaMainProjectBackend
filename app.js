import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import bodyParser from 'body-parser';
import Member from './Router/MemberForm.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extends: true }));

app.use("/Ohkla", Member);
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});


app.listen(5000, () => {
    console.log("🚀 Server started on http://localhost:5000");
});