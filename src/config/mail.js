// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: Number(process.env.MAIL_PORT),
//   secure: process.env.MAIL_SECURE === "true", // true for port 465, false for 587
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS,
//   },
// });

// // Verify connection on startup
// transporter.verify((error) => {
//   if (error) {
//     console.error("❌ Mail transporter error:", error.message);
//   } else {
//     console.log("✅ Mail transporter ready");
//   }
// });


// export default transporter;

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


export default transporter;