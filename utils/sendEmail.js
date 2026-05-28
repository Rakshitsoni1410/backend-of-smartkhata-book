import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  console.log("📧 sendEmail called");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "SET ✅" : "NOT SET ❌");
  console.log("TO:", to);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,           // matches Render key
    pass: process.env.EMAIL_PASSWORD,  // matches Render key
  },
});

  try {
    const info = await transporter.sendMail({
      from: `"Smart Khata" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Nodemailer error:", err.message);
    console.error("❌ Full error:", err);
    throw err;
  }
};

export default sendEmail;