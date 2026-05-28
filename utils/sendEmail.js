import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });

  const info = await transporter.sendMail({
    from: `"Smart Khata" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log("✅ Email sent:", info.messageId);
  return info;
};

export default sendEmail;
