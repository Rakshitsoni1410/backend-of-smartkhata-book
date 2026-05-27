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

    try {

      const info =
        await transporter.sendMail({

          from:
            process.env.EMAIL,

          to,

          subject,

          html,
        });

      console.log(
        "✅ Email Sent:",
        info.response
      );

    } catch (error) {

      console.log(
        "❌ Email Error:",
        error
      );
    }
  };

export default sendEmail;