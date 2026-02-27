function getProvider() {
  return String(process.env.EMAIL_PROVIDER || "console").trim().toLowerCase();
}

function getEmailFrom() {
  return String(process.env.EMAIL_FROM || "").trim();
}

function providerName() {
  return getProvider() || "console";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendViaResend({ to, subject, text, html }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const emailFrom = getEmailFrom();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for EMAIL_PROVIDER=resend.");
  }
  if (!emailFrom) {
    throw new Error("EMAIL_FROM is required for EMAIL_PROVIDER=resend.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}

async function sendViaPostmark({ to, subject, text, html }) {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || "").trim();
  const emailFrom = getEmailFrom();
  if (!token) {
    throw new Error("POSTMARK_SERVER_TOKEN is required for EMAIL_PROVIDER=postmark.");
  }
  if (!emailFrom) {
    throw new Error("EMAIL_FROM is required for EMAIL_PROVIDER=postmark.");
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: emailFrom,
      To: Array.isArray(to) ? to.join(",") : to,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postmark failed (${response.status}): ${body}`);
  }
}

async function sendViaSendGrid({ to, subject, text, html }) {
  const apiKey = String(process.env.SENDGRID_API_KEY || "").trim();
  const emailFrom = getEmailFrom();
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is required for EMAIL_PROVIDER=sendgrid.");
  }
  if (!emailFrom) {
    throw new Error("EMAIL_FROM is required for EMAIL_PROVIDER=sendgrid.");
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients }],
      from: { email: emailFrom },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid failed (${response.status}): ${body}`);
  }
}

async function sendTransactionalEmail({ to, subject, text, html }) {
  const provider = getProvider();
  const normalizedTo = Array.isArray(to) ? to : [to];
  if (normalizedTo.length === 0 || !normalizedTo[0]) {
    throw new Error("Recipient email is required.");
  }

  if (provider === "resend") {
    await sendViaResend({ to: normalizedTo, subject, text, html });
    return { provider: "resend" };
  }
  if (provider === "postmark") {
    await sendViaPostmark({ to: normalizedTo, subject, text, html });
    return { provider: "postmark" };
  }
  if (provider === "sendgrid") {
    await sendViaSendGrid({ to: normalizedTo, subject, text, html });
    return { provider: "sendgrid" };
  }

  // Development/default provider: log locally.
  console.log(`[email:${provider || "console"}] to=${normalizedTo.join(",")} subject=${subject}\n${text}`);
  return { provider: provider || "console" };
}

function verificationEmailBody({ code, expiresMinutes }) {
  const safeCode = escapeHtml(code);
  return {
    subject: "Verify your Tag Along email",
    text: `Your Tag Along verification code is ${code}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your Tag Along verification code is <strong>${safeCode}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p>`,
  };
}

function passwordResetEmailBody({ code, expiresMinutes }) {
  const safeCode = escapeHtml(code);
  return {
    subject: "Reset your Tag Along password",
    text: `Your Tag Along password reset code is ${code}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your Tag Along password reset code is <strong>${safeCode}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p>`,
  };
}

async function sendVerificationCodeEmail({ to, code, expiresMinutes }) {
  const body = verificationEmailBody({ code, expiresMinutes });
  return sendTransactionalEmail({
    to,
    subject: body.subject,
    text: body.text,
    html: body.html,
  });
}

async function sendPasswordResetCodeEmail({ to, code, expiresMinutes }) {
  const body = passwordResetEmailBody({ code, expiresMinutes });
  return sendTransactionalEmail({
    to,
    subject: body.subject,
    text: body.text,
    html: body.html,
  });
}

module.exports = {
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  emailProviderName: providerName,
};
