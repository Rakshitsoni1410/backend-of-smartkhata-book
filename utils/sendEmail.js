import nodemailer from "nodemailer";

const emailService = process.env.EMAIL_SERVICE || "gmail";

const transporter = nodemailer.createTransport({
  service: emailService,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"smartkhata book" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId || info.response);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    return undefined;
  }
};

export const sendWelcomeEmail = async (to, subject, html) => sendMail(to, subject, html);

export const sendEmail = async (toOrOptions, subject, html) => {
  if (typeof toOrOptions === "object" && toOrOptions !== null) {
    const { to, subject: mailSubject, html: mailHtml } = toOrOptions;
    return sendMail(to, mailSubject, mailHtml);
  }

  return sendMail(toOrOptions, subject, html);
};

export default sendEmail;