import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async (email, name) => {
  try {
    const info = await transporter.sendMail({
      from: `"Smart Khatabook" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Smart Khatabook",
      html: `
        <h2>Hello ${name}</h2>
        <p>Your account created successfully.</p>
      `,
    });

    console.log("MAIL SENT:", info.response);
  } catch (err) {
    console.log("MAIL ERROR:", err);
  }
};