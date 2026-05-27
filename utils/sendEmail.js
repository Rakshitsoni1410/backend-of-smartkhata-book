import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

// DEBUG ENV VARIABLES
console.log("EMAIL:", process.env.EMAIL);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD);

// CREATE TRANSPORTER
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// VERIFY SMTP
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:");
    console.log(error);
  } else {
    console.log("SMTP READY");
  }
});

// MAIN SEND FUNCTION
const sendMail = async (to, subject, html) => {
  try {
    // CHECK ENV
    if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
      throw new Error("Email credentials missing");
    }

    // SEND EMAIL
    const info = await transporter.sendMail({
      from: `"SmartKhata Book" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT SUCCESSFULLY");
    console.log(info.messageId);

    return info;

  } catch (error) {

    console.log("EMAIL ERROR START");
    console.log(error);
    console.log("EMAIL ERROR END");

    return undefined;
  }
};

// SEND WELCOME EMAIL
export const sendWelcomeEmail = async (
  to,
  subject,
  html
) => {
  return sendMail(to, subject, html);
};

// GENERIC EMAIL FUNCTION
export const sendEmail = async (
  toOrOptions,
  subject,
  html
) => {

  // OBJECT FORMAT
  if (
    typeof toOrOptions === "object" &&
    toOrOptions !== null
  ) {

    const {
      to,
      subject: mailSubject,
      html: mailHtml,
    } = toOrOptions;

    return sendMail(
      to,
      mailSubject,
      mailHtml
    );
  }

  // NORMAL FORMAT
  return sendMail(
    toOrOptions,
    subject,
    html
  );
};

export default sendEmail;