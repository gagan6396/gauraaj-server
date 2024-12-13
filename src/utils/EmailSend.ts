import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmailToAdmins = async (
  recipients: string[],
  subject: string,
  html: string
) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients, 
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to Admins:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email to admins:", error);
    throw new Error("Failed to send email to admins.");
  }
};

export const sendEmailToSupplier = async (
  recipient: string,
  subject: string,
  html: string
) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient, 
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to Supplier:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email to supplier:", error);
    throw new Error("Failed to send email to supplier.");
  }
};
