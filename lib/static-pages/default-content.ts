import type { StaticPageKey } from "@/lib/generated/prisma";

type DefaultStaticPageContent = {
  title: string;
  tagline: string;
  body: string;
};

export const DEFAULT_STATIC_PAGE_CONTENT: Record<
  StaticPageKey,
  DefaultStaticPageContent
> = {
  ABOUT: {
    title: "About",
    tagline:
      "IJKRI is a multidisciplinary, peer-reviewed and open-access scholarly journal dedicated to the publication of rigorous research, innovative ideas and practical contributions with academic and societal relevance.",
    body: `JOURNAL OVERVIEW
A scholarly platform for research, innovation and impact

The International Journal of Knowledge, Research and Innovation provides a platform for researchers, academics, professionals and policy practitioners to publish original research, reviews, conceptual studies, case analyses and applied innovations.

The journal welcomes high-quality contributions from management, social sciences, education, technology, engineering, sustainability, health management and related interdisciplinary fields.

Each manuscript is evaluated for originality, relevance, methodological quality, ethical compliance and contribution to scholarship or professional practice.

JOURNAL INFORMATION
Journal Title: International Journal of Knowledge, Research and Innovation
Abbreviation: IJKRI
Publisher: Innovare Academic Publishing
Access Model: Open access
Review Model: Double-blind peer review
Publication Scope: Multidisciplinary
Publication Language: English
Publication Frequency: Continuous publication within scheduled issues

MISSION
To advance credible and useful scholarship

IJKRI exists to support the publication and dissemination of original, ethical and methodologically sound research that advances knowledge, informs practice and contributes to innovation.

VISION
To become a trusted international research journal

Our vision is to develop IJKRI into a respected multidisciplinary publication recognised for research quality, editorial transparency, accessibility and meaningful scholarly impact.

JOURNAL OBJECTIVES
What IJKRI seeks to achieve

1. Provide a credible international platform for original and innovative research.
2. Encourage multidisciplinary collaboration among researchers, practitioners and policy professionals.
3. Support the dissemination of evidence-based findings with academic and societal relevance.
4. Maintain a transparent, ethical and efficient peer-review and publication process.
5. Promote scholarly visibility, knowledge exchange and practical application of research.

CORE VALUES
Principles that guide the journal

Academic Integrity — We promote honest, transparent and responsible scholarship across every stage of submission, review and publication.
Research Quality — Manuscripts are assessed for originality, methodological soundness, relevance and contribution to knowledge.
Innovation — We welcome research that offers new ideas, practical solutions, interdisciplinary perspectives and measurable impact.
Global Accessibility — Our open-access model is designed to make published research available to readers across institutions and countries.

PEER REVIEW AND EDITORIAL INDEPENDENCE
IJKRI uses a double-blind peer-review process. Reviewers evaluate manuscripts independently, and editorial decisions are based on scholarly merit, reviewer recommendations and journal policy.

Editors are expected to make decisions without improper influence from authors, reviewers, advertisers, sponsors or institutional interests.

OPEN ACCESS AND COPYRIGHT
The journal is committed to broad access to scholarly work. Published articles are made available online according to the journal's open-access and licensing policies.

Authors retain rights subject to the publication agreement and applicable licence. Final licensing details will be stated clearly on each published article.

PUBLICATION ETHICS
IJKRI expects authors, reviewers and editors to follow recognised standards of research and publication ethics.

DOI REGISTRATION
Eligible published articles may be assigned Digital Object Identifiers after metadata review and successful registration.

ABSTRACTING AND INDEXING
Indexing applications and inclusion claims will be displayed only after confirmation by the relevant indexing service.`,
  },

  AIMS_SCOPE: {
    title: "Aims & Scope",
    tagline:
      "The International Journal of Knowledge, Research and Innovation publishes rigorous, original and relevant scholarship that advances understanding, informs practice and contributes to responsible innovation across disciplines.",
    body: `JOURNAL AIM
Advancing knowledge through credible research

IJKRI provides an international and multidisciplinary platform for researchers, academics, practitioners and policy professionals to communicate high-quality research and innovative ideas.

The journal encourages work that addresses contemporary academic, organisational, economic, social, technological, environmental and public policy challenges.

Particular attention is given to manuscripts that demonstrate methodological rigour, theoretical relevance, practical usefulness and a clear contribution to existing knowledge.

CORE PUBLISHING PRINCIPLES
- Originality and scholarly contribution
- Methodological and analytical rigour
- Ethical and transparent research practice
- Clear practical or theoretical relevance
- Constructive and impartial peer review
- Accessibility of research findings

SUBJECT COVERAGE
Areas welcomed by the journal (indicative rather than exhaustive — interdisciplinary manuscripts are welcome when their contribution is clearly explained):

Business, Management and Economics
- Management and organisational studies
- Leadership and strategic management
- Entrepreneurship and innovation
- Human resource management
- Marketing and consumer behaviour
- Accounting, finance and taxation
- Public administration and governance
- Operations and supply-chain management

Science, Engineering and Technology
- Computer science and information systems
- Artificial intelligence and automation
- Engineering and applied technology
- Renewable energy and sustainable technologies
- Data science and digital transformation
- Telecommunications and network systems
- Industrial and production engineering
- Technology management and innovation systems

Education and Social Sciences
- Educational management and policy
- Curriculum development and teaching practice
- Higher education and institutional development
- Sociology and social development
- Psychology and behavioural studies
- Communication and media studies
- Development studies
- Public policy and social innovation

Health and Life Sciences
- Public health and health administration
- Healthcare management
- Nursing and allied health sciences
- Health technology and innovation
- Environmental and occupational health
- Biomedical and applied life sciences
- Healthcare logistics and service delivery
- Community health and health policy

Agriculture, Environment and Sustainability
- Agricultural economics and agribusiness
- Food systems and food security
- Environmental management
- Climate change and adaptation
- Sustainable development
- Green business and circular economy
- Natural-resource management
- Rural development and agricultural innovation

Interdisciplinary and Emerging Research
- Research crossing disciplinary boundaries
- Innovation with practical or policy relevance
- Digital society and emerging technologies
- Sustainability and responsible innovation
- Institutional and organisational transformation
- Knowledge management
- Artificial intelligence in business and society
- Applied research addressing contemporary problems

ARTICLE TYPES CONSIDERED
- Original empirical research articles
- Systematic literature reviews
- Scoping and integrative reviews
- Conceptual and theoretical papers
- Case studies
- Methodological papers
- Policy and practice papers
- Short research communications
- Book reviews, where formally commissioned

MANUSCRIPTS OUTSIDE THE SCOPE
- Work lacking a clear research question or scholarly contribution.
- Manuscripts that are purely promotional or commercial.
- Submissions without adequate methodological explanation.
- Material already published or simultaneously submitted elsewhere.
- Manuscripts containing fabricated, falsified or plagiarised material.
- Work that falls outside the journal's academic and professional remit.

International relevance — Submissions may address local, national or international contexts, but the contribution should be clearly relevant to a wider scholarly or professional audience.

Practical contribution — Applied studies should clearly explain how findings may inform management, policy, technology, education, healthcare, industry or community practice.

Interdisciplinary value — Research combining methods, theories or evidence from multiple fields is encouraged when the integration strengthens the manuscript.`,
  },

  AUTHOR_GUIDELINES: {
    title: "Author Guidelines",
    tagline:
      "Authors should read these instructions carefully before submitting a manuscript to IJKRI. Manuscripts that do not meet the journal requirements may be returned before peer review.",
    body: `BEFORE YOU SUBMIT
Confirm that the manuscript is suitable for IJKRI

The corresponding author is responsible for ensuring that the manuscript is complete, accurate and approved by every listed author before submission.

Submission to IJKRI confirms that the work is original, has not been published previously and is not being considered simultaneously by another journal.

Authors must ensure that the study falls within the journal's multidisciplinary scope and that all research, ethical and reporting requirements have been satisfied.

Essential submission conditions:
- The manuscript is original and not under consideration elsewhere.
- All authors have reviewed and approved the submission.
- Required ethical approvals and participant consent have been obtained.
- Sources, quotations, data, figures and ideas have been properly acknowledged.
- Conflicts of interest, funding and artificial-intelligence use have been disclosed.

MANUSCRIPT TYPES CONSIDERED
Word ranges are general guides and may vary by discipline, research design and complexity. References, tables and supplementary material may be excluded from the main word count where appropriate.

Original Research Article (5,000–8,000 words) — Reports original empirical or theoretical research with a clearly defined problem, rigorous methodology, substantial analysis and a meaningful contribution to knowledge. Structure: Abstract, keywords, introduction, literature review, methodology, results, discussion, conclusion and references.

Review Article (6,000–10,000 words) — Provides a critical and well-structured synthesis of existing literature, identifies gaps and proposes directions for future research. Structure: Abstract, keywords, introduction, review method, thematic synthesis, discussion, research gaps, conclusion and references.

Short Communication (2,000–4,000 words) — Presents important preliminary findings, concise empirical results, methodological innovations or time-sensitive scholarly observations. Structure: Abstract, keywords, introduction, method, key findings, discussion, conclusion and references.

Case Study (3,500–6,000 words) — Examines a specific organisation, event, intervention, policy, industry or social setting and draws clear theoretical or practical lessons. Structure: Abstract, keywords, case background, problem, analysis, findings, implications, conclusion and references.

Conceptual Paper (4,000–7,000 words) — Develops or extends concepts, frameworks, models or theoretical propositions through logical analysis and engagement with relevant literature. Structure: Abstract, keywords, introduction, conceptual foundation, proposed framework, discussion, implications and conclusion.

Technical Note (2,000–4,000 words) — Describes a practical method, research instrument, process improvement, technical development or applied innovation. Structure: Abstract, keywords, background, method or technique, application, results, limitations and conclusion.

REQUIRED MANUSCRIPT COMPONENTS
The exact organisation may differ by manuscript type, but the following elements should be included where relevant.

01. Title Page
- Provide a clear, specific and informative manuscript title.
- List the full names of all authors in the correct publication order.
- State each author's institutional affiliation, department, city and country.
- Identify the corresponding author and provide a valid email address.
- Include ORCID identifiers where available.
- Provide a short running title where appropriate.

02. Anonymous Manuscript File
- Remove author names, affiliations, acknowledgements and identifying information.
- Remove identifying details from file properties and tracked changes.
- Avoid self-references that reveal the identity of the authors.
- Use neutral wording such as "previous research" instead of "our previous study" where anonymity may be compromised.

03. Abstract
- Use a structured or unstructured abstract depending on the manuscript type.
- The abstract should normally contain 150–300 words.
- State the purpose, method, principal findings, implications and conclusion.
- Do not include citations, unexplained abbreviations, tables or figures.
- Ensure the abstract accurately reflects the content of the manuscript.

04. Keywords
- Provide four to seven keywords immediately after the abstract.
- Choose terms that reflect the main concepts, variables, population, setting or method.
- Avoid repeating words already used extensively in the title.
- Use recognised subject terms where possible to improve discoverability.

05. Introduction
- Present the background and context of the study.
- Clearly identify the research problem or knowledge gap.
- Explain the importance and relevance of the study.
- State the aim, objectives, research questions or hypotheses.
- End with a concise statement of the contribution of the manuscript.

06. Literature Review or Theoretical Foundation
- Critically engage with recent and relevant literature.
- Organise the review around themes, concepts, debates or theoretical relationships.
- Avoid a purely descriptive sequence of individual studies.
- Explain the theoretical or conceptual framework guiding the study.
- Show clearly how the study addresses an identified gap.

07. Methodology
- Describe the research design and justify its suitability.
- Identify the study population, sample, setting and selection procedure.
- Explain data-collection instruments and procedures.
- Report validity, reliability, trustworthiness or quality controls.
- Describe the data-analysis techniques used.
- Include ethical approval and informed-consent information where applicable.
- Provide enough detail for another researcher to understand or reproduce the method.

08. Results or Findings
- Present findings clearly and logically in relation to the research objectives.
- Avoid repeating all numerical information in both text and tables.
- Report appropriate statistical values, effect sizes and significance levels where relevant.
- For qualitative work, present themes with adequate supporting evidence.
- Do not introduce extensive interpretation that belongs in the discussion section.

09. Discussion
- Interpret the principal findings rather than merely restating them.
- Relate the findings to relevant theories and previous studies.
- Explain agreements, differences, unexpected results and possible reasons.
- Discuss theoretical, managerial, policy, professional or social implications.
- Avoid claims that are not supported by the evidence.

10. Conclusion and Recommendations
- Summarise the study's main contribution without repeating the abstract.
- State the practical and scholarly significance of the findings.
- Present recommendations that follow directly from the evidence.
- Acknowledge important limitations.
- Suggest realistic areas for future research.

11. Declarations
- Funding statement.
- Conflict-of-interest declaration.
- Ethical approval statement where applicable.
- Informed-consent statement where applicable.
- Data-availability statement.
- Author-contribution statement.
- Acknowledgements.
- Declaration of generative artificial-intelligence use where applicable.

12. References
- Use APA 7th edition unless the journal announces a different style for a special issue.
- Ensure every in-text citation appears in the reference list.
- Ensure every reference-list entry is cited in the text.
- Include DOI links for sources that have DOIs.
- Prioritise credible, relevant and reasonably recent scholarly sources.

FORMATTING REQUIREMENTS
File format: Microsoft Word format (.doc or .docx). A PDF may be included only as a supplementary viewing copy.
Page size: A4 paper size.
Margins: At least 2.54 cm on all sides.
Font: Times New Roman, 12-point font for the main text. Use consistent font sizes throughout the manuscript.
Line spacing: Double spacing for the main text, references, tables and figure captions unless otherwise instructed.
Alignment: Use left alignment for headings and justified or left-aligned body text consistently.
Paragraphs: Use consistent paragraph indentation or spacing. Do not separate every sentence with a blank line.
Page numbers: Number all pages consecutively, beginning with the title page.
Headings: Use a clear and consistent hierarchy. Do not number headings unnecessarily unless required by the discipline.
Language: Manuscripts must be written in clear academic English. British or American spelling may be used, but usage must remain consistent.
Abbreviations: Define each abbreviation at first use and avoid unnecessary abbreviations.
Units: Use internationally recognised units, preferably SI units, and define uncommon measurements.

PREPARING TABLES
- Number tables consecutively in the order in which they are mentioned in the manuscript.
- Provide a concise and informative title above each table.
- Define abbreviations and explanatory notes below the table.
- Ensure the table can be understood without excessive reference to the main text.
- Do not submit tables as low-quality screenshots or images.
- Obtain permission to reproduce or adapt previously published material.

PREPARING FIGURES AND ILLUSTRATIONS
- Number figures consecutively according to their first mention in the text.
- Supply clear captions below each figure.
- Use high-resolution images with readable labels and legends.
- Avoid unnecessary decoration, three-dimensional effects and misleading scales.
- Remove personal identifiers from photographs and research images unless written consent permits their use.
- State the source and permission status of reproduced figures.

APA 7TH EDITION REFERENCE STYLE
IJKRI uses the American Psychological Association reference style, seventh edition. Authors are responsible for the accuracy and completeness of every citation.

In-text citations:
One author — Parenthetical: (Author, 2024); Narrative: Author (2024)
Two authors — Parenthetical: (Author & Author, 2024); Narrative: Author1 and Author2 (2024)
Three or more authors — Parenthetical: (Author et al., 2024); Narrative: Author et al. (2024)
Direct quotation — Include the author, year and page number: (Author, 2024, p. 18).

Reference-list principles:
- Arrange entries alphabetically by the surname of the first author.
- Use a hanging indentation for each entry.
- Italicise journal titles, volume numbers and book titles as required by APA 7.
- Present DOI values as active links beginning with https://doi.org/.
- Do not include database names for ordinary journal articles unless APA 7 specifically requires them.
- Verify author names, dates, article titles, page ranges, DOI links and URLs before submission.

Reference examples:
Journal article — Author, A. A., & Author, B. B. (2024). Title of the article. Journal Title, 12(3), 101–118. https://doi.org/10.xxxx/xxxxx
Book — Author, A. A. (2023). Title of the book (2nd ed.). Publisher.
Chapter in an edited book — Author, A. A. (2022). Title of chapter. In B. B. Editor (Ed.), Title of book (pp. 25–48). Publisher.
Webpage — Organisation Name. (2025, March 14). Title of webpage. Site Name. https://example.com/page
Report — Organisation Name. (2024). Title of report (Report No. 15). Publisher. https://doi.org/10.xxxx/xxxxx

ETHICAL RESPONSIBILITIES OF AUTHORS
Authors must comply with recognised principles of research integrity and publication ethics throughout the submission and publication process.

Originality and plagiarism — Submitted work must be original. All quotations, ideas, data, figures and materials obtained from other sources must be properly acknowledged. Manuscripts may be screened using similarity-detection software.

Duplicate and simultaneous submission — A manuscript must not be submitted to IJKRI while it is under consideration by another journal. Substantially similar work must not be published more than once without clear justification and disclosure.

Data fabrication and falsification — Authors must not invent, manipulate, omit or misrepresent research data, methods, images, statistical results or participant information.

Authorship and contributorship — Every listed author must have made a meaningful scholarly contribution, approved the submitted version and accepted responsibility for the work. Individuals who do not meet authorship criteria should be acknowledged appropriately.

Conflicts of interest — Authors must disclose financial, professional, institutional or personal relationships that could reasonably be perceived to influence the research or its interpretation.

Funding disclosure — All financial support, grants, sponsorships and material assistance must be identified, including the role of the funder in the study.

Ethical approval and informed consent — Research involving human participants, identifiable personal data, clinical material or animals must comply with applicable ethical and legal standards. Identify the approving ethics committee or review board, include the approval reference number where one was issued, state how informed consent was obtained, explain any waiver of consent or ethical review, and protect participant confidentiality.

Research data and reproducibility — Authors should retain accurate research records and provide sufficient methodological information to permit evaluation and, where appropriate, replication. Include a data-availability statement, state whether data are publicly available, restricted or available on reasonable request, identify recognised repositories and persistent links where applicable, and preserve source data and research documentation.

POLICY ON AI-ASSISTED WRITING AND RESEARCH
IJKRI permits limited and transparent use of generative-AI tools. Such tools must not replace author judgement, scholarly responsibility or research integrity.

Permitted assistance — Generative artificial-intelligence tools may be used for limited language improvement, grammar correction, translation assistance or organisational support, provided the authors review and take responsibility for the final content.

Required disclosure — Authors must disclose the name of the tool, the purpose for which it was used and the sections of the manuscript affected.

Prohibited authorship — An artificial-intelligence system cannot be listed as an author because it cannot accept responsibility, approve publication or declare conflicts of interest.

Prohibited practices — Authors must not use AI tools to fabricate references, invent data, generate misleading results, conceal plagiarism or create false participant or ethical information.

Human accountability — The authors remain fully responsible for the accuracy, originality, citations, arguments, data and ethical integrity of the manuscript.

Suggested AI-use declaration: "During the preparation of this manuscript, the author(s) used [tool name and version] for [specific purpose]. The author(s) reviewed and edited the resulting material and accept full responsibility for the final content."

PUBLICATION JOURNEY
Prepare → Submit → Peer Review → Revise → Accept → Production → Publish

IJKRI follows a structured editorial process designed to support independent assessment, constructive revision and accountable publication decisions. Authors can track exactly where their manuscript stands from their author dashboard at any point in this process.

01. Submission — The corresponding author submits the manuscript, metadata and supporting files through the journal platform.
02. Initial editorial screening — The editorial office checks scope, completeness, originality, ethics, language and compliance with the author guidelines.
03. Reviewer assignment — Suitable manuscripts are assigned to qualified independent reviewers under the double-blind review model.
04. Peer review — Reviewers assess originality, methodology, analysis, clarity, significance and ethical compliance.
05. Editorial decision — The editor issues an acceptance, minor revision, major revision or rejection decision after considering the reports.
06. Revision — Authors submit a revised manuscript together with a detailed point-by-point response to reviewer and editor comments.
07. Production — Accepted manuscripts proceed through copyediting, typesetting, proofreading and final author approval.
08. Publication — The final article is assigned to an issue and published with its approved metadata and publication files.

Preparing a revised manuscript:
- Address every editor and reviewer comment.
- Provide a point-by-point response document.
- Clearly identify changes made in the revised manuscript.
- Explain respectfully when a suggested change was not made.
- Upload both the clean manuscript and any marked version requested.
- Submit the revision before the stated deadline or request an extension.

Publication charges — Any submission, processing or article-publication charge must be stated clearly before payment is requested. Editorial decisions must not depend on an author's ability to pay. Current charges, exemptions and waiver arrangements should be confirmed on the journal website or directly with the editorial office.

Copyright and licensing — Authors must own or have permission to use all submitted material. The publication agreement will state the rights retained by authors and the licence applied to the final article. Third-party material must be identified and supported by written permission where required.

Corrections and retractions — Authors must inform the journal promptly if a significant error is discovered after submission or publication. The journal may issue corrections, expressions of concern or retractions where necessary to protect the integrity of the scholarly record.

FINAL SUBMISSION CHECKLIST
Check every item before submitting. Incomplete submissions may be returned to the corresponding author before editorial screening.
- The manuscript falls within the aims and scope of IJKRI.
- The work is original and is not under consideration elsewhere.
- All authors approved the manuscript and author order.
- The title page and anonymous manuscript are separate files.
- The abstract and keywords meet the journal requirements.
- The manuscript is formatted consistently and pages are numbered.
- Tables and figures are cited, numbered and clearly labelled.
- All in-text citations appear in the reference list.
- All reference-list entries are cited in the manuscript.
- References follow APA 7th edition.
- Ethical approval and informed consent are reported where required.
- Funding, conflicts of interest and data availability are declared.
- Any use of generative AI has been disclosed.
- Permission has been obtained for copyrighted material.
- The corresponding author's contact information is complete.`,
  },

  PEER_REVIEW: {
    title: "Peer Review",
    tagline:
      "IJKRI applies a structured double-blind peer-review process intended to support fair, independent and evidence-based editorial decisions.",
    body: `DOUBLE-BLIND AND CONFIDENTIAL ASSESSMENT
Under the double-blind model, authors are not informed of reviewer identities and reviewers are not informed of author identities.

Authors must remove names, affiliations, acknowledgements and other identifying details from the review version of the manuscript.

Reviewers must treat the manuscript and all associated materials as confidential and must not use unpublished information for personal, professional or competitive advantage.

CORE PRINCIPLES
- Editorial independence
- Reviewer confidentiality
- Impartial assessment
- Conflict-of-interest disclosure
- Constructive feedback
- Timely review
- Respectful professional conduct

HOW MANUSCRIPTS ARE ASSESSED
01. Submission and technical checks — The editorial office confirms that the manuscript is complete, properly anonymised, within scope and broadly compliant with the submission requirements.
02. Initial editorial assessment — An editor evaluates originality, relevance, presentation, ethical compliance and overall suitability before external review.
03. Reviewer selection — Qualified reviewers are selected according to subject expertise, availability, independence and the absence of conflicting interests.
04. Double-blind peer review — Reviewer and author identities are concealed from one another. Reviewers assess the manuscript confidentially and provide reasoned recommendations.
05. Editorial decision — The editor considers the reviewers' reports, the manuscript and journal policy before issuing an editorial decision.
06. Revision and reassessment — Where revision is requested, authors respond to each comment and submit a revised manuscript. Further review may be required.
07. Final decision — The editor may accept, request further revision or reject the manuscript based on the evidence available.
08. Production and publication — Accepted manuscripts proceed to copyediting, typesetting, proofreading, author proof approval and final publication.

POSSIBLE OUTCOMES AFTER REVIEW
Accept — The manuscript is suitable for publication, subject to any minor production corrections.
Minor Revision — Limited changes are required and the editor may assess the revision without another full review round.
Major Revision — Substantial changes are required. The revised manuscript may be returned to the original or new reviewers.
Reject — The manuscript is unsuitable for publication because of scope, quality, originality, methodology, ethics or contribution concerns.

REVIEWER RESPONSIBILITIES
- Accept assignments only within relevant expertise.
- Declare conflicts before accepting a review.
- Provide objective and evidence-based comments.
- Avoid hostile, discriminatory or personal language.
- Do not contact authors directly about the manuscript.
- Submit reports within the agreed period.

AUTHOR RESPONSIBILITIES
- Submit an anonymised review manuscript.
- Respond carefully to reviewer comments.
- Identify all changes in the revised manuscript.
- Provide a point-by-point response document.
- Disclose conflicts, funding and relevant ethical approvals.
- Avoid simultaneous submission to another journal.

EDITOR RESPONSIBILITIES
- Select suitably qualified and independent reviewers.
- Protect confidential information.
- Manage conflicts of interest.
- Evaluate reviews critically rather than automatically.
- Make decisions on scholarly merit and journal policy.
- Respond appropriately to ethical concerns and complaints.

Reviewer selection — Reviewers are selected using subject expertise, publication history, research profile, previous reviewing experience, availability and independence from the authors or institutions involved. Editors should avoid reviewers with recent collaboration, supervisory, financial, personal or competitive relationships that may affect impartiality.

Review timeframe — Reviewers are normally given a defined review period. Extensions may be granted where justified and communicated promptly. Actual decision times depend on reviewer availability, manuscript complexity, revision quality and the need for additional review rounds.

Conflicts of interest — Reviewers and editors must disclose any circumstance that could reasonably be perceived as affecting objectivity. Where necessary, the assignment will be declined or reassigned.

Appeals and complaints — Authors may submit a reasoned appeal where they believe a material error occurred in the review or decision process. Disagreement alone does not guarantee reconsideration.

WHAT REVIEWERS ASSESS
Originality and contribution — Does the manuscript add something meaningful to existing knowledge, rather than repeating already-published work?
Methodological rigour — Is the research design, sample, data collection and analysis appropriate and clearly justified for the questions being asked?
Engagement with literature — Does the manuscript critically engage with relevant, current scholarship rather than listing sources without synthesis?
Clarity and structure — Is the argument easy to follow, with a logical structure from introduction through to conclusion?
Evidence and interpretation — Are claims and conclusions properly supported by the data or analysis presented, without overreach?
Ethical compliance — Where applicable, is there evidence of appropriate ethical approval, informed consent, and honest reporting of methods and data?

REVIEWER RECOGNITION
Reviewing is a scholarly contribution in its own right. IJKRI recognises reviewers in several ways:
- Digital certificates — Reviewers can generate a certificate for each completed review from their reviewer dashboard.
- Reviewer Ambassador Programme — Active reviewers can take part in the journal's referral programme and track their standing on the public reviewer leaderboard.
- Reviewer profile — Consistent, high-quality reviewers can track their performance and standing from their reviewer performance dashboard.`,
  },

  PUBLICATION_ETHICS: {
    title: "Publication Ethics",
    tagline:
      "IJKRI is committed to maintaining the highest standards of publication ethics and follows internationally recognised best practices to ensure the credibility and integrity of the scholarly record.",
    body: `ETHICAL PUBLISHING IS THE FOUNDATION OF SCHOLARLY COMMUNICATION
IJKRI expects authors, reviewers, editors, and publishers to uphold honesty, transparency, accountability, confidentiality, and respect throughout the publication process. Every manuscript is assessed solely on academic merit without discrimination.

Allegations of plagiarism, duplicate publication, fabricated research, image manipulation, citation manipulation, or any other form of research misconduct are investigated thoroughly before editorial decisions are made.

PRINCIPLES
- Integrity
- Transparency
- Confidentiality
- Fairness
- Accountability
- Research Quality

AUTHORS
- Submit only original work that has not been published or submitted elsewhere.
- Present research honestly without fabrication, falsification, or inappropriate data manipulation.
- Accurately acknowledge all contributors and list only eligible authors.
- Disclose funding sources and any potential conflicts of interest.
- Obtain ethical approval where research involves humans, animals, or sensitive data.
- Promptly notify the editorial office if a significant error is discovered after submission or publication.

EDITORS
- Evaluate manuscripts solely on academic merit without discrimination.
- Maintain confidentiality throughout the editorial and peer-review process.
- Manage conflicts of interest transparently.
- Ensure fair, timely, and objective editorial decisions.
- Take appropriate action in cases of suspected research misconduct.

REVIEWERS
- Provide objective, constructive, and evidence-based reviews.
- Maintain strict confidentiality of submitted manuscripts.
- Declare any conflicts of interest before accepting a review invitation.
- Complete reviews within the agreed timeframe.
- Identify relevant literature that has not been cited where appropriate.

JOURNAL POLICIES
Plagiarism — All submissions are screened for originality. Manuscripts containing plagiarism, self-plagiarism, or unattributed material will be rejected.
Duplicate Submission — Authors must not submit the same manuscript simultaneously to multiple journals or conferences.
Conflict of Interest — Authors, reviewers, and editors must disclose any financial, institutional, or personal relationships that could influence editorial decisions.
Research Integrity — Fabrication, falsification, manipulation of images or data, and unethical research practices are strictly prohibited.
Corrections & Retractions — Where necessary, the journal will publish corrections, expressions of concern, or retractions to maintain the integrity of the scholarly record.
AI-Assisted Writing — Artificial intelligence tools may assist writing but must not replace human authorship. Authors remain fully responsible for the accuracy, originality, and integrity of their work.

TRUST AND TRANSPARENCY
Editorial Independence — Editorial decisions are based solely on academic merit, peer-review outcomes, and journal policy. Commercial or publisher interests do not influence acceptance or rejection decisions.
Complaints & Appeals — Authors, reviewers, or readers may raise a reasoned complaint or appeal regarding an editorial decision or process by contacting the editorial office. Each case is reviewed on its merits; disagreement alone does not guarantee reconsideration.
Data Availability — Authors are expected to include a data-availability statement describing whether underlying research data are publicly available, restricted, or available on reasonable request.
Archiving — Published articles are retained on the journal platform for permanent online access, with their assigned DOI providing a stable, citable link to the published version of record.
Copyright & Licensing — Authors must own or have permission to use all submitted material. The publication agreement states the rights retained by authors and the licence applied to the final published article.`,
  },

  WHY_IJKRI: {
    title: "Why IJKRI",
    tagline:
      "IJKRI is a multidisciplinary, peer-reviewed, open-access journal. Here is what that means in practice for authors considering a submission.",
    body: `- Independent double-blind peer review — Every submission is assessed by qualified reviewers without revealing author or reviewer identity to each other, reducing bias in the editorial decision.
- Transparent editorial workflow — Authors can track their manuscript through screening, review, revision, and production, with clear communication at each stage.
- Open-access publication — Published articles are freely available online, with no subscription barrier for readers, widening the potential audience for your work.
- DOI assignment — Accepted articles receive a Digital Object Identifier, giving your work a permanent, citable link.
- Professional article pages — Each published article gets a dedicated page with abstract, metadata, citation formats, and a downloadable PDF.
- Structured revision and production process — Manuscripts move through copyediting, typesetting, and proofreading before publication, following a defined production workflow.
- Multidisciplinary readership — IJKRI publishes across management, social science, technology, education, and sustainability, connecting your research with readers outside a single narrow field.
- Author support throughout submission — Author guidelines, submission tracking, and an editorial office contact are available at every step of the process.

A NOTE ON CLAIMS
We do not claim a journal impact factor, guaranteed acceptance, or membership in indexing databases we are not verifiably listed in. If you are evaluating IJKRI for a submission, review our publication ethics and peer review process pages, or contact the editorial office directly with questions.`,
  },

  FAQ: {
    title: "Frequently Asked Questions",
    tagline:
      "Common questions from authors, reviewers, and editors about submitting to and publishing with IJKRI.",
    body: `SUBMISSION

Q: How do I submit a manuscript to IJKRI?
A: Create an author account, then use the manuscript submission form to upload your paper and supporting documents. Review the author guidelines first to make sure your manuscript meets formatting requirements.

Q: What manuscript types does IJKRI accept?
A: Original research articles, review articles, conceptual papers, and case studies. See the current Call for Papers for the specific scope of the open issue.

Q: Can I submit the same manuscript to another journal at the same time?
A: No. Manuscripts must be original and not under review elsewhere. Submitting the same work to multiple journals simultaneously is a breach of publication ethics.

PEER REVIEW

Q: What type of peer review does IJKRI use?
A: Double-blind peer review by default — author and reviewer identities are not disclosed to each other. See the full peer review process page for each stage and possible decisions.

Q: How long does peer review take?
A: Timelines vary by submission volume and reviewer availability. You can track your manuscript's status from your author dashboard at any point in the process.

Q: How do I respond to reviewer comments?
A: If a revision is requested, you will receive reviewer comments through your author dashboard and can upload a revised manuscript along with a response to reviewers.

AUTHORS

Q: Do I need to pay to submit my manuscript?
A: Submission itself is free. An article processing charge applies only if your manuscript is accepted for publication — see Fees below.

Q: Who can be listed as a co-author?
A: Everyone listed as a co-author should have made a substantive contribution to the research and have approved the final manuscript and author order before submission.

REVIEWERS

Q: How do I become a reviewer for IJKRI?
A: Apply through the "Become a Reviewer" page. Reviewer responsibilities and review criteria are outlined on the peer review page.

Q: Is there recognition for reviewers?
A: Reviewers can receive digital certificates for completed reviews, and the journal recognises consistent reviewer contributions through its reviewer programme.

EDITORS

Q: Who makes the final decision on a manuscript?
A: Editorial decisions are made by the handling editor based on reviewer recommendations, editorial policy, and the manuscript's fit with the journal's scope.

PUBLICATION

Q: How will I know when my article is published?
A: You will be notified once your article is published, and it will appear on the current issue and archives pages with its own article page.

Q: Can I share my published article?
A: Yes. Published articles are open access, so you are free to share the link, download the PDF, and cite the article using the citation formats provided on its article page.

DOI

Q: Does IJKRI assign DOIs?
A: Accepted articles receive a Digital Object Identifier (DOI), giving your work a permanent, citable link.

OPEN ACCESS

Q: Is IJKRI an open-access journal?
A: Yes. Published articles are freely available to read online without a subscription.

FEES

Q: What is the article processing charge (APC)?
A: The current APC is shown at the point of acceptance and on your invoice. It covers editorial handling, production, and open-access hosting of your article. The APC applies only after a manuscript is accepted.

ETHICS

Q: What is IJKRI's position on plagiarism?
A: Manuscripts are expected to be original work with proper attribution. See the full publication ethics policy for details on plagiarism, duplicate submission, and research integrity.

Q: How does IJKRI handle conflicts of interest?
A: Authors, reviewers, and editors are required to disclose any conflicts of interest that could influence a manuscript's evaluation. See the publication ethics page for the full policy.

COPYRIGHT

Q: Who holds copyright for published articles?
A: Copyright and licensing terms are set out in the journal's copyright policy, available from the journal administration and referenced on each article's page.`,
  },

  TERMS: {
    title: "Terms of Use",
    tagline:
      "Terms governing use of the IJKRI platform. Please read these terms carefully before creating an account, submitting a manuscript, or using the platform in any other capacity.",
    body: `Last updated: August 15, 2026

These terms describe the platform's intended operation in plain language. They are not a substitute for formal legal advice; the publisher should have this document reviewed by qualified legal counsel for the jurisdictions in which it operates before relying on it as a binding legal agreement.

1. ACCEPTANCE OF THESE TERMS
These Terms of Use govern your access to and use of the International Journal of Knowledge, Research and Innovation (IJKRI) platform, published by Innovare Academic Publishing. By creating an account, submitting a manuscript, reviewing a manuscript, or otherwise using the platform, you agree to these terms.

If you do not agree to these terms, please do not use the platform.

2. ACCOUNTS AND ELIGIBILITY
You must provide accurate registration information and keep your account credentials confidential. You are responsible for all activity that occurs under your account.

Accounts are personal to the individual who registered them. Authors, reviewers, and editors must use their own identity — shared or fabricated accounts are not permitted.

3. MANUSCRIPT SUBMISSION AND PUBLICATION
By submitting a manuscript, you confirm that the work is original, that you have the right to submit it, and that it is not under consideration elsewhere, consistent with our publication ethics policy.

Manuscripts are subject to editorial screening and peer review as described in our peer review process. Submission does not guarantee acceptance or publication, and the editorial team retains full discretion over editorial decisions.

Once an article is published, it becomes part of the permanent scholarly record and is not withdrawn from the archive except through a formal correction, expression of concern, or retraction, in line with standard academic publishing practice.

4. INTELLECTUAL PROPERTY AND LICENSING
Authors retain the rights described in their publication agreement and the licence applied to their published article. You must own or have permission to use all material you submit, including third-party figures, data, or excerpts.

Platform content that is not a published article — including the site design, branding, and editorial content such as Research Insights — remains the property of Innovare Academic Publishing or its licensors and may not be reproduced without permission, except as permitted by the licence on an individual published article.

5. FEES AND PAYMENTS
Any article processing charge, subscription, or article purchase price is stated before payment is requested and processed through our payment provider. Editorial decisions are made independently of an author's ability to pay.

6. PROHIBITED CONDUCT
- Submitting fabricated, falsified, or plagiarised work.
- Attempting to manipulate the peer review process, including impersonating a reviewer or reviewing your own work.
- Using the platform to upload malicious files or attempt unauthorised access to other accounts or systems.
- Harassing, discriminating against, or acting abusively toward other users, reviewers, or editorial staff.

7. DISCLAIMERS AND LIMITATION OF LIABILITY
The platform is provided on an "as is" basis. While we take reasonable steps to keep the platform available and accurate, we do not guarantee uninterrupted access or that published content is free of error.

To the fullest extent permitted by applicable law, Innovare Academic Publishing is not liable for indirect, incidental, or consequential damages arising from your use of the platform.

8. CHANGES TO THESE TERMS
We may update these terms from time to time. Material changes will be reflected by updating the "Last updated" date above. Continued use of the platform after an update constitutes acceptance of the revised terms.`,
  },

  PRIVACY: {
    title: "Privacy Policy",
    tagline:
      "This policy explains what personal data IJKRI collects, why, and how you can exercise control over it.",
    body: `Last updated: August 15, 2026

This policy describes the data practices of the IJKRI platform in plain language. It is not a substitute for formal legal advice; the publisher should have this policy reviewed by qualified legal counsel for the jurisdictions in which it operates before relying on it for regulatory compliance.

INFORMATION WE COLLECT
Account information — Name, email address, affiliation, country, and password (stored as a salted hash, never in plain text) when you register as an author, reviewer, editor, or other platform user.
Submission content — Manuscript files, metadata, author lists, keywords, cover letters, and any supporting documents you upload as part of a submission or peer review.
Payment information — Article processing charges, subscriptions, and article purchases are processed by Paystack. We store transaction records and status, but card details are handled directly by Paystack and are not stored on our servers.
Newsletter subscription — If you subscribe to the IJKRI Research Update, we store the email address you provide and your subscription status until you unsubscribe.
Technical and usage data — Session cookies required for sign-in, and aggregate, privacy-preserving analytics (Vercel Analytics and Speed Insights) used to understand site performance and usage.

HOW WE USE THIS INFORMATION
- Operating your account and the manuscript submission, peer review, and publication workflow.
- Processing payments for article processing charges, subscriptions, and article purchases.
- Sending transactional emails, such as submission status updates, review invitations, and account notifications.
- Sending the IJKRI Research Update newsletter, if you have subscribed, with an unsubscribe link in every email.
- Maintaining the security, integrity, and availability of the platform, including error monitoring.
- Complying with legal, editorial, and record-keeping obligations, including maintaining the scholarly record for published articles.

THIRD PARTIES WE WORK WITH
We share the minimum data necessary with the following service providers to operate the journal. We do not sell personal data.
Paystack — Processes payments for article processing charges, subscriptions, and article purchases.
Resend — Delivers transactional and notification emails on our behalf.
Sentry — Provides error monitoring to help us detect and fix technical issues.
Vercel — Hosts the platform and provides privacy-preserving analytics and performance monitoring.

DATA RETENTION
We retain account and submission data for as long as your account is active and as needed to maintain the scholarly record of published articles, comply with legal obligations, resolve disputes, and enforce our policies. Newsletter subscriber data is retained until you unsubscribe.

YOUR RIGHTS
- Request a copy of the personal data we hold about you.
- Ask us to correct inaccurate or incomplete information.
- Ask us to delete your account information, subject to our need to retain editorial and publication records.
- Unsubscribe from the newsletter at any time using the link in every email.
- Object to or request that we restrict certain uses of your data.

Note that published articles form part of the permanent scholarly record and are not removed from the archive once published, in line with standard academic publishing practice and our publication ethics policy.

COOKIES
We use a session cookie that is required to keep you signed in, and privacy-preserving, aggregate analytics that do not rely on cross-site tracking cookies.

CHANGES TO THIS POLICY
We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.`,
  },
};
