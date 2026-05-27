import nodemailer from "nodemailer";

const transporter =
  nodemailer.createTransport({

    service: "gmail",

    auth: {

      user:
        process.env.EMAIL,

      pass:
        process.env.EMAIL_PASSWORD,
    },
  });

const sendEmail =
  async ({
    to,
    subject,
    html,
  }) => {

    await transporter.sendMail({

      from:
        process.env.EMAIL,

      to,

      subject,

      html,
    });
  };

export default sendEmail;