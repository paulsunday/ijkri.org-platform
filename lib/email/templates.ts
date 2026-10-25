const journalName =
  "International Journal of Knowledge, Research and Innovation";

const journalShortName = "IJKRI";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPosition(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function emailButton({
  url,
  label,
  background = "#f59e0b",
  color = "#0f172a",
}: {
  url: string;
  label: string;
  background?: string;
  color?: string;
}) {
  return `
    <p style="margin:28px 0;">
      <a
        href="${escapeHtml(url)}"
        style="
          display:inline-block;
          background:${background};
          color:${color};
          padding:13px 22px;
          border-radius:8px;
          font-weight:700;
          text-decoration:none;
        "
      >
        ${escapeHtml(label)}
      </a>
    </p>
  `;
}

function informationBox({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return `
    <div
      style="
        margin:22px 0;
        padding:16px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:8px;
      "
    >
      <strong>${escapeHtml(title)}:</strong><br />
      ${content}
    </div>
  `;
}

function emailLayout({
  heading,
  content,
}: {
  heading: string;
  content: string;
}) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f8fafc;
          color:#0f172a;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="background:#f8fafc;padding:32px 16px;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width:640px;
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:14px;
                  overflow:hidden;
                "
              >
                <tr>
                  <td
                    style="
                      background:#020617;
                      color:#ffffff;
                      padding:28px;
                    "
                  >
                    <div
                      style="
                        color:#fbbf24;
                        font-size:13px;
                        font-weight:700;
                        letter-spacing:1.5px;
                      "
                    >
                      ${journalShortName}
                    </div>

                    <h1
                      style="
                        margin:10px 0 0;
                        font-size:25px;
                        line-height:1.3;
                      "
                    >
                      ${escapeHtml(heading)}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:30px;
                      font-size:16px;
                      line-height:1.7;
                    "
                  >
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      border-top:1px solid #e2e8f0;
                      padding:22px 30px;
                      color:#64748b;
                      font-size:13px;
                      line-height:1.6;
                    "
                  >
                    ${journalName}<br />
                    Published by Innovare Academic Publishing
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function passwordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
}: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const safeName = escapeHtml(name);

  return {
    subject: `${journalShortName}: Reset your password`,

    text: [
      `Hello ${name},`,
      "",
      "A password reset was requested for your account.",
      `Use this link within ${expiresInMinutes} minutes:`,
      resetUrl,
      "",
      "Ignore this message if you did not request a reset.",
    ].join("\n"),

    html: emailLayout({
      heading: "Reset your password",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          We received a request to reset the password for
          your ${journalShortName} account.
        </p>

        <p>
          This link will expire in
          <strong>${expiresInMinutes} minutes</strong>.
        </p>

        ${emailButton({
        url: resetUrl,
        label: "Reset Password",
      })}

        <p>
          If you did not request this change, ignore this
          email. Your password will remain unchanged.
        </p>
      `,
    }),
  };
}

export function registrationEmail({
  name,
  loginUrl,
}: {
  name: string;
  loginUrl: string;
}) {
  const safeName = escapeHtml(name);

  return {
    subject: `Welcome to ${journalShortName}`,

    text: [
      `Hello ${name},`,
      "",
      `Your ${journalShortName} author account has been created successfully.`,
      `Sign in here: ${loginUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Your account has been created",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your author account for the ${journalName}
          has been created successfully.
        </p>

        <p>
          You can now submit manuscripts, monitor editorial
          progress, upload revisions and receive decisions.
        </p>

        ${emailButton({
        url: loginUrl,
        label: "Sign In",
      })}
      `,
    }),
  };
}

export function welcomeEmail({
  name,
  appUrl,
}: {
  name: string;
  appUrl: string;
}) {
  const safeName = escapeHtml(name);

  const links = [
    { label: "About IJKRI", url: `${appUrl}/about` },
    { label: "Author Guidelines", url: `${appUrl}/author-guidelines` },
    { label: "Submit Manuscript", url: `${appUrl}/author/submit` },
    { label: "Current Issue", url: `${appUrl}/current-issue` },
    { label: "Reviewer Centre", url: `${appUrl}/reviewer/apply` },
  ];

  const linksListHtml = links
    .map(
      (link) => `
        <li style="margin:0 0 10px;">
          <a
            href="${escapeHtml(link.url)}"
            style="color:#2563eb;text-decoration:none;font-weight:600;"
          >
            ${escapeHtml(link.label)}
          </a>
        </li>
      `,
    )
    .join("");

  return {
    subject: `Welcome to ${journalShortName}`,

    text: [
      `Hello ${name},`,
      "",
      `Welcome to the ${journalName} (${journalShortName}) — a multidisciplinary,`,
      "peer-reviewed and open-access journal committed to advancing knowledge,",
      "research and innovation.",
      "",
      "Your account is now active. A few places to get started:",
      ...links.map((link) => `- ${link.label}: ${link.url}`),
      "",
      "If you have any questions, simply reply to this email and our",
      "editorial team will be glad to help.",
    ].join("\n"),

    html: emailLayout({
      heading: `Welcome to ${journalShortName}`,
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Welcome to the <strong>${journalName}</strong>
          (${journalShortName}) — a multidisciplinary,
          peer-reviewed and open-access journal committed to
          advancing knowledge, research and innovation.
        </p>

        <p>
          Your account is now active. Whether you are here to
          submit your own research, review the work of others, or
          simply follow the latest issue, we are glad to have you
          as part of our community.
        </p>

        ${emailButton({
        url: appUrl,
        label: "Explore IJKRI",
      })}

        <p style="margin-bottom:8px;">
          <strong>A few places to get started:</strong>
        </p>

        <ul style="margin:0 0 20px;padding-left:20px;">
          ${linksListHtml}
        </ul>

        <p>
          If you have any questions, simply reply to this email
          and our editorial team will be glad to help.
        </p>
      `,
    }),
  };
}

export function reviewerApplicationApprovedEmail({
  name,
  journalName: selectedJournalName,
  reviewerDashboardUrl,
}: {
  name: string;
  journalName: string;
  reviewerDashboardUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  return {
    subject: `${journalShortName}: Reviewer application approved`,

    text: [
      `Hello ${name},`,
      "",
      `Your reviewer application for ${selectedJournalName} has been approved.`,
      "",
      `Reviewer dashboard: ${reviewerDashboardUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Reviewer application approved",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your application to serve as a reviewer for
          <strong>${safeJournalName}</strong> has been
          approved.
        </p>

        <p>
          You may now receive manuscript-review invitations
          matching your declared areas of expertise.
        </p>

        ${emailButton({
        url: reviewerDashboardUrl,
        label: "Open Reviewer Dashboard",
      })}

        <p>
          Please keep your profile and areas of expertise
          accurate and up to date.
        </p>
      `,
    }),
  };
}

export function reviewerApplicationRejectedEmail({
  name,
  journalName: selectedJournalName,
  reviewNotes,
  contactUrl,
}: {
  name: string;
  journalName: string;
  reviewNotes?: string | null;
  contactUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  const safeNotes = reviewNotes
    ? escapeHtml(reviewNotes)
    : "No additional explanation was provided.";

  return {
    subject: `${journalShortName}: Reviewer application decision`,

    text: [
      `Hello ${name},`,
      "",
      `Your reviewer application for ${selectedJournalName} was not approved at this time.`,
      reviewNotes
        ? `Editorial note: ${reviewNotes}`
        : "",
      "",
      `Contact the editorial office: ${contactUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),

    html: emailLayout({
      heading: "Reviewer application decision",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Thank you for your interest in reviewing for
          <strong>${safeJournalName}</strong>.
        </p>

        <p>
          After reviewing your application, the editorial
          office has decided not to approve reviewer access
          at this time.
        </p>

        ${informationBox({
        title: "Editorial note",
        content: safeNotes,
      })}

        <p>
          You may contact the editorial office if you require
          clarification.
        </p>

        ${emailButton({
        url: contactUrl,
        label: "Contact Editorial Office",
        background: "#0f172a",
        color: "#ffffff",
      })}
      `,
    }),
  };
}

export function careerApplicationReceivedEmail({
  name,
  position,
  journalName: selectedJournalName,
  careersUrl,
}: {
  name: string;
  position: string;
  journalName: string;
  careersUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  return {
    subject: `${journalShortName}: Career application received`,

    text: [
      `Hello ${name},`,
      "",
      `We received your application for ${formatPosition(position)}.`,
      `Journal: ${selectedJournalName}`,
      "",
      "Your application is currently pending editorial screening.",
      `Career opportunities: ${careersUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Career application received",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          We have received your application for the position
          of <strong>${safePosition}</strong> with
          <strong>${safeJournalName}</strong>.
        </p>

        <p>
          Your application is currently pending editorial
          screening. The publishing team will review the
          information and supporting materials you submitted.
        </p>

        <p>
          Submission of an application does not guarantee
          appointment, employment, remuneration or platform
          access.
        </p>

        ${emailButton({
        url: careersUrl,
        label: "View Career Information",
        background: "#0f172a",
        color: "#ffffff",
      })}
      `,
    }),
  };
}

export function careerApplicationUnderReviewEmail({
  name,
  position,
  journalName: selectedJournalName,
}: {
  name: string;
  position: string;
  journalName: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  return {
    subject: `${journalShortName}: Career application under review`,

    text: [
      `Hello ${name},`,
      "",
      `Your application for ${formatPosition(position)} is now under review.`,
      `Journal: ${selectedJournalName}`,
      "",
      "No action is required from you unless the editorial office requests additional information.",
    ].join("\n"),

    html: emailLayout({
      heading: "Your application is under review",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your application for
          <strong>${safePosition}</strong> with
          <strong>${safeJournalName}</strong> has moved to
          the formal review stage.
        </p>

        <p>
          The publishing team is assessing your qualifications,
          experience, professional statement and supporting
          materials.
        </p>

        <p>
          No action is required unless the editorial office
          contacts you for clarification or additional
          documents.
        </p>
      `,
    }),
  };
}

export function careerApplicationShortlistedEmail({
  name,
  position,
  journalName: selectedJournalName,
  contactUrl,
}: {
  name: string;
  position: string;
  journalName: string;
  contactUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  return {
    subject: `${journalShortName}: Career application shortlisted`,

    text: [
      `Hello ${name},`,
      "",
      `Your application for ${formatPosition(position)} has been shortlisted.`,
      `Journal: ${selectedJournalName}`,
      "",
      "The editorial office may contact you for an interview, assessment or additional documents.",
      `Contact: ${contactUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Your application has been shortlisted",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your application for
          <strong>${safePosition}</strong> with
          <strong>${safeJournalName}</strong> has been
          shortlisted.
        </p>

        <p>
          This means your application has passed the initial
          assessment. The next stage may include an interview,
          practical assessment, reference check or request for
          additional documents.
        </p>

        <p>
          Shortlisting does not constitute a final appointment.
        </p>

        ${emailButton({
        url: contactUrl,
        label: "Contact Editorial Office",
        background: "#0f172a",
        color: "#ffffff",
      })}
      `,
    }),
  };
}

export function careerInterviewScheduledEmail({
  name,
  position,
  journalName: selectedJournalName,
  interviewDate,
  reviewNotes,
  contactUrl,
}: {
  name: string;
  position: string;
  journalName: string;
  interviewDate: Date;
  reviewNotes?: string | null;
  contactUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  const formattedInterviewDate =
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(interviewDate);

  const safeInterviewDate = escapeHtml(
    formattedInterviewDate,
  );

  const safeNotes = reviewNotes
    ? escapeHtml(reviewNotes)
    : "The editorial office will provide any additional interview instructions separately.";

  return {
    subject: `${journalShortName}: Career interview scheduled`,

    text: [
      `Hello ${name},`,
      "",
      `An interview has been scheduled for your ${formatPosition(position)} application.`,
      `Journal: ${selectedJournalName}`,
      `Interview date: ${formattedInterviewDate} UTC`,
      reviewNotes
        ? `Instructions: ${reviewNotes}`
        : "",
      "",
      `Contact the editorial office: ${contactUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),

    html: emailLayout({
      heading: "Career interview scheduled",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          An interview has been scheduled regarding your
          application for <strong>${safePosition}</strong>
          with <strong>${safeJournalName}</strong>.
        </p>

        ${informationBox({
        title: "Interview date and time",
        content: `${safeInterviewDate} UTC`,
      })}

        ${informationBox({
        title: "Interview instructions",
        content: safeNotes,
      })}

        <p>
          Please contact the editorial office promptly if you
          cannot attend at the scheduled time.
        </p>

        ${emailButton({
        url: contactUrl,
        label: "Contact Editorial Office",
        background: "#0f172a",
        color: "#ffffff",
      })}
      `,
    }),
  };
}

export function careerApplicationApprovedEmail({
  name,
  position,
  journalName: selectedJournalName,
  assignedRole,
  accountUrl,
}: {
  name: string;
  position: string;
  journalName: string;
  assignedRole?: string | null;
  accountUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  const roleText = assignedRole
    ? formatPosition(assignedRole)
    : formatPosition(position);

  const safeRoleText = escapeHtml(roleText);

  return {
    subject: `${journalShortName}: Career application approved`,

    text: [
      `Hello ${name},`,
      "",
      `Your application for ${formatPosition(position)} has been approved.`,
      `Journal: ${selectedJournalName}`,
      `Assigned role: ${roleText}`,
      "",
      `Open your account: ${accountUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Career application approved",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your application for
          <strong>${safePosition}</strong> with
          <strong>${safeJournalName}</strong> has been
          approved.
        </p>

        ${informationBox({
        title: "Assigned platform role",
        content: safeRoleText,
      })}

        <p>
          Your appointment or platform access remains subject
          to any onboarding, verification, policy acceptance or
          role-specific instructions issued by the publisher.
        </p>

        ${emailButton({
        url: accountUrl,
        label: "Open Your Account",
      })}
      `,
    }),
  };
}

export function careerApplicationRejectedEmail({
  name,
  position,
  journalName: selectedJournalName,
  reviewNotes,
  contactUrl,
}: {
  name: string;
  position: string;
  journalName: string;
  reviewNotes: string;
  contactUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safePosition = escapeHtml(
    formatPosition(position),
  );
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );
  const safeNotes = escapeHtml(reviewNotes);

  return {
    subject: `${journalShortName}: Career application decision`,

    text: [
      `Hello ${name},`,
      "",
      `Your application for ${formatPosition(position)} was not approved at this time.`,
      `Journal: ${selectedJournalName}`,
      `Editorial note: ${reviewNotes}`,
      "",
      `Contact the editorial office: ${contactUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Career application decision",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          Thank you for applying for the position of
          <strong>${safePosition}</strong> with
          <strong>${safeJournalName}</strong>.
        </p>

        <p>
          After reviewing your application, the publishing
          team has decided not to approve it at this time.
        </p>

        ${informationBox({
        title: "Editorial note",
        content: safeNotes,
      })}

        <p>
          You may contact the editorial office if you require
          clarification. This decision does not prevent you
          from applying for a different opportunity in the
          future.
        </p>

        ${emailButton({
        url: contactUrl,
        label: "Contact Editorial Office",
        background: "#0f172a",
        color: "#ffffff",
      })}
      `,
    }),
  };
}
export function reviewerInvitationEmail({
  reviewerName,
  journalName: selectedJournalName,
  manuscriptTitle,
  reviewRound,
  dueDate,
  invitationUrl,
}: {
  reviewerName: string;
  journalName: string;
  manuscriptTitle: string;
  reviewRound: number;
  dueDate: Date | null;
  invitationUrl: string;
}) {
  const safeReviewerName =
    escapeHtml(reviewerName);

  const safeJournalName =
    escapeHtml(selectedJournalName);

  const safeManuscriptTitle =
    escapeHtml(manuscriptTitle);

  const formattedDueDate = dueDate
    ? new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    ).format(dueDate)
    : "No deadline was specified";

  const safeDueDate =
    escapeHtml(formattedDueDate);

  return {
    subject:
      `${journalShortName}: Invitation to review a manuscript`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `You have been invited to review a manuscript for ${selectedJournalName}.`,
      "",
      `Manuscript: ${manuscriptTitle}`,
      `Review round: ${reviewRound}`,
      `Review deadline: ${formattedDueDate}`,
      "",
      "Please open your reviewer workspace to accept or decline the invitation.",
      invitationUrl,
      "",
      "Treat the manuscript and all related materials as confidential.",
    ].join("\n"),

    html: emailLayout({
      heading:
        "Invitation to review a manuscript",

      content: `
        <p>
          Hello ${safeReviewerName},
        </p>

        <p>
          You have been invited to review a manuscript for
          <strong>${safeJournalName}</strong>.
        </p>

        ${informationBox({
        title: "Manuscript title",
        content:
          safeManuscriptTitle,
      })}

        ${informationBox({
        title: "Review round",
        content:
          String(reviewRound),
      })}

        ${informationBox({
        title: "Review deadline",
        content:
          safeDueDate,
      })}

        <p>
          Please open your reviewer workspace to accept or
          decline the invitation. Accept the assignment only
          when the manuscript falls within your expertise and
          no conflict of interest prevents an impartial review.
        </p>

        ${emailButton({
        url: invitationUrl,
        label:
          "Open Review Invitation",
      })}

        <p>
          The manuscript and all associated information must
          be treated as confidential. Do not contact the
          author directly or share the manuscript with another
          person.
        </p>
      `,
    }),
  };
}
function formatReviewerCommentsText(
  reviewerComments?: (string | null | undefined)[],
) {
  const nonEmptyComments = (reviewerComments ?? []).filter(
    (comment): comment is string => Boolean(comment && comment.trim()),
  );

  if (nonEmptyComments.length === 0) {
    return [];
  }

  return [
    "",
    "Reviewer comments:",
    ...nonEmptyComments.flatMap((comment, index) => [
      `Reviewer ${index + 1}:`,
      comment.trim(),
      "",
    ]),
  ];
}

function reviewerCommentsHtml(
  reviewerComments?: (string | null | undefined)[],
) {
  const nonEmptyComments = (reviewerComments ?? []).filter(
    (comment): comment is string => Boolean(comment && comment.trim()),
  );

  return nonEmptyComments
    .map((comment, index) =>
      informationBox({
        title: `Reviewer ${index + 1} comments`,
        content: escapeHtml(comment.trim()).replaceAll("\n", "<br />"),
      }),
    )
    .join("");
}

export function revisionRequestedEmail({
  authorName,
  journalName: selectedJournalName,
  manuscriptTitle,
  decisionComments,
  reviewerComments,
  revisionDeadline,
  submissionUrl,
}: {
  authorName: string;
  journalName: string;
  manuscriptTitle: string;
  decisionComments: string;
  reviewerComments?: (string | null | undefined)[];
  revisionDeadline: Date;
  submissionUrl: string;
}) {
  const safeAuthorName = escapeHtml(authorName);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );
  const safeManuscriptTitle = escapeHtml(
    manuscriptTitle,
  );
  const safeComments = escapeHtml(
    decisionComments,
  ).replaceAll("\n", "<br />");

  const formattedDeadline =
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(revisionDeadline);

  const safeDeadline = escapeHtml(
    formattedDeadline,
  );

  return {
    subject: `${journalShortName}: Revision required for your manuscript`,

    text: [
      `Hello ${authorName},`,
      "",
      `A revision has been requested for your manuscript submitted to ${selectedJournalName}.`,
      "",
      `Manuscript: ${manuscriptTitle}`,
      `Revision deadline: ${formattedDeadline}`,
      "",
      "Editorial comments:",
      decisionComments,
      ...formatReviewerCommentsText(reviewerComments),
      "",
      `Open your submission: ${submissionUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Revision required",
      content: `
        <p>Hello ${safeAuthorName},</p>

        <p>
          A revision has been requested for your manuscript
          submitted to <strong>${safeJournalName}</strong>.
        </p>

        ${informationBox({
        title: "Manuscript title",
        content: safeManuscriptTitle,
      })}

        ${informationBox({
        title: "Revision deadline",
        content: safeDeadline,
      })}

        ${informationBox({
        title: "Editorial decision letter",
        content: safeComments,
      })}

        ${reviewerCommentsHtml(reviewerComments)}

        <p>
          Please prepare a revised manuscript and a clear
          point-by-point response explaining how each editorial
          and reviewer comment was addressed.
        </p>

        ${emailButton({
        url: submissionUrl,
        label: "Open Submission",
      })}

        <p>
          Upload the revision before the stated deadline. Contact
          the editorial office promptly if a justified extension
          is required.
        </p>
      `,
    }),
  };
}

export function manuscriptAcceptedEmail({
  authorName,
  journalName: selectedJournalName,
  manuscriptTitle,
  decisionComments,
  reviewerComments,
  submissionUrl,
  apc,
}: {
  authorName: string;
  journalName: string;
  manuscriptTitle: string;
  decisionComments: string;
  reviewerComments?: (string | null | undefined)[];
  submissionUrl: string;
  apc?: {
    invoiceNumber: string;
    amount: string;
    currency: string;
    dueDate: string | null;
    invoiceUrl: string;
  } | null;
}) {
  const safeAuthorName = escapeHtml(authorName);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );
  const safeManuscriptTitle = escapeHtml(
    manuscriptTitle,
  );
  const safeComments = escapeHtml(
    decisionComments,
  ).replaceAll("\n", "<br />");

  const apcTextLines = apc
    ? [
      "",
      "Article Processing Charge:",
      `Invoice ${apc.invoiceNumber} — ${apc.currency} ${apc.amount}`,
      apc.dueDate ? `Due by ${apc.dueDate}` : "",
      `Pay your invoice: ${apc.invoiceUrl}`,
    ].filter(Boolean)
    : [];

  return {
    subject: `${journalShortName}: Your manuscript has been accepted`,

    text: [
      `Hello ${authorName},`,
      "",
      `Your manuscript submitted to ${selectedJournalName} has been accepted.`,
      "",
      `Manuscript: ${manuscriptTitle}`,
      "",
      "Editorial comments:",
      decisionComments,
      ...formatReviewerCommentsText(reviewerComments),
      ...apcTextLines,
      "",
      "The manuscript will now proceed to the production workflow.",
      `Open your submission: ${submissionUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Manuscript accepted",
      content: `
        <p>Hello ${safeAuthorName},</p>

        <p>
          We are pleased to inform you that your manuscript
          submitted to <strong>${safeJournalName}</strong>
          has been accepted for publication.
        </p>

        ${informationBox({
        title: "Manuscript title",
        content: safeManuscriptTitle,
      })}

        ${informationBox({
        title: "Editorial decision letter",
        content: safeComments,
      })}

        ${reviewerCommentsHtml(reviewerComments)}

        ${apc
          ? informationBox({
            title: "Article Processing Charge",
            content:
              `Invoice ${escapeHtml(apc.invoiceNumber)}: ` +
              `<strong>${escapeHtml(apc.currency)} ${escapeHtml(apc.amount)}</strong>` +
              (apc.dueDate
                ? ` — due by ${escapeHtml(apc.dueDate)}`
                : "") +
              `<br />Please pay this invoice from your author dashboard so your article can proceed to publication.`,
          })
          : ""
        }

        ${apc
          ? emailButton({
            url: apc.invoiceUrl,
            label: "Pay APC Invoice",
          })
          : ""
        }

        <p>
          The manuscript will now proceed through copyediting,
          typesetting, proofreading and author proof approval.
          Publication remains subject to successful completion
          of those production stages.
        </p>

        ${emailButton({
        url: submissionUrl,
        label: "View Accepted Manuscript",
      })}

        <p>
          Please monitor your account and email for production
          queries and proof-approval requests.
        </p>
      `,
    }),
  };
}

export function manuscriptReceivedEmail({
  authorName,
  journalName: selectedJournalName,
  manuscriptTitle,
  manuscriptDisplayId,
  submissionUrl,
}: {
  authorName: string;
  journalName: string;
  manuscriptTitle: string;
  manuscriptDisplayId: string;
  submissionUrl: string;
}) {
  const safeAuthorName = escapeHtml(authorName);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );
  const safeManuscriptTitle = escapeHtml(
    manuscriptTitle,
  );
  const safeDisplayId = escapeHtml(
    manuscriptDisplayId,
  );

  return {
    subject: `${journalShortName}: Manuscript received (${manuscriptDisplayId})`,

    text: [
      `Hello ${authorName},`,
      "",
      `We have received your manuscript submitted to ${selectedJournalName}.`,
      "",
      `Manuscript ID: ${manuscriptDisplayId}`,
      `Title: ${manuscriptTitle}`,
      "",
      "What happens next:",
      "1. Editorial screening to confirm the manuscript fits the journal's scope and formatting requirements.",
      "2. If it passes screening, it is assigned to independent reviewers for double-blind peer review.",
      "3. You will be notified by email of the outcome of each stage.",
      "",
      `Please quote the manuscript ID ${manuscriptDisplayId} in any correspondence about this submission.`,
      "",
      `View your submission: ${submissionUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Manuscript received",
      content: `
        <p>Hello ${safeAuthorName},</p>

        <p>
          Thank you for submitting your manuscript to
          <strong>${safeJournalName}</strong>. This email
          confirms that we have received it.
        </p>

        ${informationBox({
        title: "Manuscript ID",
        content: `<strong>${safeDisplayId}</strong>`,
      })}

        ${informationBox({
        title: "Manuscript title",
        content: safeManuscriptTitle,
      })}

        <p><strong>What happens next:</strong></p>

        <ol>
          <li>
            Editorial screening to confirm the manuscript fits
            the journal's scope and formatting requirements.
          </li>
          <li>
            If it passes screening, it is assigned to
            independent reviewers for double-blind peer review.
          </li>
          <li>
            You will be notified by email of the outcome of
            each stage.
          </li>
        </ol>

        <p>
          Please quote the manuscript ID
          <strong>${safeDisplayId}</strong> in any correspondence
          about this submission.
        </p>

        ${emailButton({
        url: submissionUrl,
        label: "View Submission",
      })}
      `,
    }),
  };
}

export function manuscriptRejectedEmail({
  authorName,
  journalName: selectedJournalName,
  manuscriptTitle,
  decisionComments,
  reviewerComments,
  submissionUrl,
  contactUrl,
}: {
  authorName: string;
  journalName: string;
  manuscriptTitle: string;
  decisionComments: string;
  reviewerComments?: (string | null | undefined)[];
  submissionUrl: string;
  contactUrl: string;
}) {
  const safeAuthorName = escapeHtml(authorName);
  const safeJournalName = escapeHtml(
    selectedJournalName,
  );
  const safeManuscriptTitle = escapeHtml(
    manuscriptTitle,
  );
  const safeComments = escapeHtml(
    decisionComments,
  ).replaceAll("\n", "<br />");

  return {
    subject: `${journalShortName}: Editorial decision on your manuscript`,

    text: [
      `Hello ${authorName},`,
      "",
      `A rejection decision has been made on your manuscript submitted to ${selectedJournalName}.`,
      "",
      `Manuscript: ${manuscriptTitle}`,
      "",
      "Editorial comments:",
      decisionComments,
      ...formatReviewerCommentsText(reviewerComments),
      "",
      `View your submission: ${submissionUrl}`,
      `Contact the editorial office: ${contactUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Editorial decision",
      content: `
        <p>Hello ${safeAuthorName},</p>

        <p>
          Thank you for submitting your manuscript to
          <strong>${safeJournalName}</strong>.
        </p>

        <p>
          After consideration of the manuscript and the
          available reviewer reports, the editorial office
          has decided not to accept the manuscript for
          publication.
        </p>

        ${informationBox({
        title: "Manuscript title",
        content: safeManuscriptTitle,
      })}

        ${informationBox({
        title: "Editorial decision letter",
        content: safeComments,
      })}

        ${reviewerCommentsHtml(reviewerComments)}

        <p>
          The comments are provided to explain the decision
          and may assist you in improving the work for possible
          submission elsewhere.
        </p>

        ${emailButton({
        url: submissionUrl,
        label: "View Submission",
        background: "#0f172a",
        color: "#ffffff",
      })}

        <p>
          A reasoned appeal may be submitted only where you
          believe a material procedural or factual error
          affected the decision.
        </p>

        ${emailButton({
        url: contactUrl,
        label: "Contact Editorial Office",
        background: "#475569",
        color: "#ffffff",
      })}
      `,
    }),
  };
}
export function accountActivationEmail({
  name,
  journalName: selectedJournalName,
  assignedRole,
  activationUrl,
  expiresInHours,
}: {
  name: string;
  journalName: string;
  assignedRole: string;
  activationUrl: string;
  expiresInHours: number;
}) {
  const safeName = escapeHtml(name);

  const safeJournalName = escapeHtml(
    selectedJournalName,
  );

  const safeAssignedRole = escapeHtml(
    assignedRole
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      ),
  );

  return {
    subject:
      `${journalShortName}: Activate your staff account`,

    text: [
      `Hello ${name},`,
      "",
      `Your application to join ${selectedJournalName} has been approved.`,
      `Assigned role: ${assignedRole.replaceAll("_", " ")}`,
      "",
      `Create your password within ${expiresInHours} hours:`,
      activationUrl,
      "",
      "This activation link can only be used once.",
    ].join("\n"),

    html: emailLayout({
      heading: "Activate your staff account",

      content: `
        <p>Hello ${safeName},</p>

        <p>
          Your application to join
          <strong>${safeJournalName}</strong>
          has been approved.
        </p>

        ${informationBox({
        title: "Assigned role",
        content: safeAssignedRole,
      })}

        <p>
          A platform account has been prepared for you.
          Create a secure password before signing in.
        </p>

        <p>
          This activation link expires in
          <strong>${expiresInHours} hours</strong>
          and can only be used once.
        </p>

        ${emailButton({
        url: activationUrl,
        label: "Activate Account",
      })}

        <p>
          If you were not expecting this appointment,
          contact the editorial office and do not use
          the activation link.
        </p>
      `,
    }),
  };
}

export function referralRegisteredEmail({
  reviewerName,
  referredName,
  referralCentreUrl,
}: {
  reviewerName: string;
  referredName: string;
  referralCentreUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeReferredName = escapeHtml(referredName);

  return {
    subject: `${journalShortName}: Someone registered through your referral link`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `${referredName} created an author account using your referral link.`,
      "",
      `Referral Centre: ${referralCentreUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "New referral registration",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          <strong>${safeReferredName}</strong> created an author
          account through your referral link.
        </p>

        ${emailButton({
        url: referralCentreUrl,
        label: "Open Referral Centre",
      })}
      `,
    }),
  };
}

export function referralSubmittedEmail({
  reviewerName,
  manuscriptTitle,
  referralCentreUrl,
}: {
  reviewerName: string;
  manuscriptTitle: string;
  referralCentreUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeManuscriptTitle = escapeHtml(manuscriptTitle);

  return {
    subject: `${journalShortName}: A referred manuscript was submitted`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `A manuscript titled "${manuscriptTitle}" was submitted through your referral link.`,
      "",
      `Referral Centre: ${referralCentreUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "A referred manuscript was submitted",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          A manuscript titled <strong>${safeManuscriptTitle}</strong>
          was submitted through your referral link.
        </p>

        ${emailButton({
        url: referralCentreUrl,
        label: "Open Referral Centre",
      })}
      `,
    }),
  };
}

export function referralPublishedEmail({
  reviewerName,
  manuscriptTitle,
  referralCentreUrl,
}: {
  reviewerName: string;
  manuscriptTitle: string;
  referralCentreUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeManuscriptTitle = escapeHtml(manuscriptTitle);

  return {
    subject: `${journalShortName}: A referred manuscript was published`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `Great news — "${manuscriptTitle}", referred through your link, has been published.`,
      "",
      `Referral Centre: ${referralCentreUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "A referred manuscript was published",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          Great news — <strong>${safeManuscriptTitle}</strong>, referred
          through your link, has been published.
        </p>

        ${emailButton({
        url: referralCentreUrl,
        label: "Open Referral Centre",
      })}
      `,
    }),
  };
}

export function rewardEarnedEmail({
  reviewerName,
  description,
  amount,
  currency,
  walletUrl,
}: {
  reviewerName: string;
  description: string;
  amount: string;
  currency: string;
  walletUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeDescription = escapeHtml(description);

  return {
    subject: `${journalShortName}: You earned ${currency} ${amount}`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `You earned ${currency} ${amount}: ${description}`,
      "",
      `Wallet: ${walletUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "You earned a reward",
      content: `
        <p>Hello ${safeReviewerName},</p>

        ${informationBox({
        title: `You earned ${escapeHtml(currency)} ${escapeHtml(amount)}`,
        content: safeDescription,
      })}

        ${emailButton({
        url: walletUrl,
        label: "Open Wallet",
      })}
      `,
    }),
  };
}

export function ambassadorLevelUpEmail({
  reviewerName,
  levelLabel,
  certificatesUrl,
}: {
  reviewerName: string;
  levelLabel: string;
  certificatesUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeLevelLabel = escapeHtml(levelLabel);

  return {
    subject: `${journalShortName}: You reached ${levelLabel}`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `Congratulations — you are now a ${levelLabel}. Your certificate is ready to download.`,
      "",
      `Certificates: ${certificatesUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "New ambassador level reached",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          Congratulations — you are now a
          <strong>${safeLevelLabel}</strong>. Your certificate is ready
          to download.
        </p>

        ${emailButton({
        url: certificatesUrl,
        label: "Download Certificate",
      })}
      `,
    }),
  };
}

export function certificateIssuedEmail({
  reviewerName,
  certificateTitle,
  certificatesUrl,
}: {
  reviewerName: string;
  certificateTitle: string;
  certificatesUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeCertificateTitle = escapeHtml(certificateTitle);

  return {
    subject: `${journalShortName}: Your ${certificateTitle} is ready`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `Your ${certificateTitle} is ready to download.`,
      "",
      `Certificates: ${certificatesUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Certificate issued",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          Your <strong>${safeCertificateTitle}</strong> is ready to
          download.
        </p>

        ${emailButton({
        url: certificatesUrl,
        label: "Download Certificate",
      })}
      `,
    }),
  };
}

export function withdrawalApprovedEmail({
  reviewerName,
  amount,
  currency,
  walletUrl,
}: {
  reviewerName: string;
  amount: string;
  currency: string;
  walletUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);

  return {
    subject: `${journalShortName}: Your withdrawal was paid`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `Your withdrawal of ${currency} ${amount} has been paid out to your bank account.`,
      "",
      `Wallet: ${walletUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Withdrawal paid",
      content: `
        <p>Hello ${safeReviewerName},</p>

        <p>
          Your withdrawal of <strong>${escapeHtml(currency)} ${escapeHtml(amount)}</strong>
          has been paid out to your bank account.
        </p>

        ${emailButton({
        url: walletUrl,
        label: "Open Wallet",
      })}
      `,
    }),
  };
}

export function withdrawalFailedEmail({
  reviewerName,
  reason,
  walletUrl,
}: {
  reviewerName: string;
  reason: string;
  walletUrl: string;
}) {
  const safeReviewerName = escapeHtml(reviewerName);
  const safeReason = escapeHtml(reason);

  return {
    subject: `${journalShortName}: Your withdrawal could not be completed`,

    text: [
      `Hello ${reviewerName},`,
      "",
      `Your withdrawal could not be completed: ${reason}`,
      "The funds have been returned to your wallet balance.",
      "",
      `Wallet: ${walletUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Withdrawal could not be completed",
      content: `
        <p>Hello ${safeReviewerName},</p>

        ${informationBox({
        title: "Reason",
        content: safeReason,
      })}

        <p>The funds have been returned to your wallet balance.</p>

        ${emailButton({
        url: walletUrl,
        label: "Open Wallet",
      })}
      `,
    }),
  };
}

export function eventRegistrationConfirmedEmail({
  name,
  eventTitle,
  scheduleText,
  speakerText,
  eventUrl,
}: {
  name: string;
  eventTitle: string;
  scheduleText: string;
  speakerText: string | null;
  eventUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeEventTitle = escapeHtml(eventTitle);
  const safeScheduleText = escapeHtml(scheduleText);
  const safeSpeakerText = speakerText
    ? escapeHtml(speakerText)
    : null;

  return {
    subject: `${journalShortName}: You're registered for "${eventTitle}"`,

    text: [
      `Hello ${name},`,
      "",
      `You're confirmed for "${eventTitle}".`,
      `When: ${scheduleText}`,
      ...(safeSpeakerText ? [`Speaker: ${speakerText}`] : []),
      "",
      `Event details: ${eventUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "You're registered!",
      content: `
        <p>Hello ${safeName},</p>

        <p>
          You're confirmed for
          <strong>${safeEventTitle}</strong>.
        </p>

        ${informationBox({
        title: "When",
        content: safeScheduleText,
      })}

        ${safeSpeakerText
          ? informationBox({
            title: "Speaker",
            content: safeSpeakerText,
          })
          : ""
        }

        <p>We look forward to seeing you there.</p>

        ${emailButton({
        url: eventUrl,
        label: "View Event Details",
      })}
      `,
    }),
  };
}

export function eventRegistrationNotificationEmail({
  name,
  email,
  eventTitle,
  scheduleText,
}: {
  name: string;
  email: string;
  eventTitle: string;
  scheduleText: string;
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeEventTitle = escapeHtml(eventTitle);
  const safeScheduleText = escapeHtml(scheduleText);

  return {
    subject: `${journalShortName}: New registration for "${eventTitle}"`,

    text: [
      `${name} (${email}) just registered for "${eventTitle}".`,
      `When: ${scheduleText}`,
    ].join("\n"),

    html: emailLayout({
      heading: "New event registration",
      content: `
        <p>
          <strong>${safeName}</strong> (${safeEmail})
          just registered for
          <strong>${safeEventTitle}</strong>.
        </p>

        ${informationBox({
        title: "When",
        content: safeScheduleText,
      })}
      `,
    }),
  };
}

export function agreementSigningRequestEmail({
  signerName,
  journalName: selectedJournalName,
  manuscriptTitle,
  manuscriptDisplayId,
  signingUrl,
}: {
  signerName: string;
  journalName: string;
  manuscriptTitle: string;
  manuscriptDisplayId: string;
  signingUrl: string;
}) {
  const safeSignerName = escapeHtml(signerName);
  const safeJournalName = escapeHtml(selectedJournalName);
  const safeManuscriptTitle = escapeHtml(manuscriptTitle);
  const safeDisplayId = escapeHtml(manuscriptDisplayId);

  return {
    subject: `${journalShortName}: Please sign the publication agreement (${manuscriptDisplayId})`,

    text: [
      `Hello ${signerName},`,
      "",
      `Your manuscript submitted to ${selectedJournalName} has had its ` +
        "Article Processing Charge settled, and is ready to proceed to " +
        "production. Before that can happen, the publication agreement for " +
        "this manuscript needs your signature.",
      "",
      `Manuscript ID: ${manuscriptDisplayId}`,
      `Title: ${manuscriptTitle}`,
      "",
      `Review and sign the agreement: ${signingUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Signature required: publication agreement",
      content: `
        <p>Hello ${safeSignerName},</p>

        <p>
          Your manuscript submitted to <strong>${safeJournalName}</strong>
          has had its Article Processing Charge settled, and is ready to
          proceed to production. Before that can happen, the publication
          agreement for this manuscript needs your signature.
        </p>

        ${informationBox({
        title: "Manuscript",
        content: `${safeDisplayId} — ${safeManuscriptTitle}`,
      })}

        ${emailButton({
        url: signingUrl,
        label: "Review and Sign Agreement",
      })}
      `,
    }),
  };
}

export function agreementFullySignedEmail({
  authorName,
  journalName: selectedJournalName,
  manuscriptTitle,
  manuscriptDisplayId,
  submissionUrl,
}: {
  authorName: string;
  journalName: string;
  manuscriptTitle: string;
  manuscriptDisplayId: string;
  submissionUrl: string;
}) {
  const safeAuthorName = escapeHtml(authorName);
  const safeJournalName = escapeHtml(selectedJournalName);
  const safeManuscriptTitle = escapeHtml(manuscriptTitle);
  const safeDisplayId = escapeHtml(manuscriptDisplayId);

  return {
    subject: `${journalShortName}: Publication agreement fully signed (${manuscriptDisplayId})`,

    text: [
      `Hello ${authorName},`,
      "",
      `The publication agreement for "${manuscriptTitle}" ` +
        `(${manuscriptDisplayId}) submitted to ${selectedJournalName} has ` +
        "now been signed by all required signers.",
      "",
      "Your manuscript will now proceed into production.",
      "",
      `View your submission: ${submissionUrl}`,
    ].join("\n"),

    html: emailLayout({
      heading: "Agreement fully signed",
      content: `
        <p>Hello ${safeAuthorName},</p>

        <p>
          The publication agreement for your manuscript submitted to
          <strong>${safeJournalName}</strong> has now been signed by all
          required signers.
        </p>

        ${informationBox({
        title: "Manuscript",
        content: `${safeDisplayId} — ${safeManuscriptTitle}`,
      })}

        <p>Your manuscript will now proceed into production.</p>

        ${emailButton({
        url: submissionUrl,
        label: "View Submission",
      })}
      `,
    }),
  };
}