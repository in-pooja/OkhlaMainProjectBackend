import nodemailer from "nodemailer";
// :white_check_mark: Gmail SMTP Transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
        user: "infoSamarpan2025@gmail.com",     // Your email
        pass: "irkd ywnt yevq khio",            // App password
    },
});
async function sendMail(to, subject, text) {
    const mailOptions = {
        from: "infoSamarpan2025@gmail.com",
        to,
        subject,
        text,
    };
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(":x: Email failed:", error);
                reject(error);
            } else {
                console.log(":white_check_mark: Email sent:", info.response);
                resolve(info);
            }
        });
    });
}
export default sendMail;


