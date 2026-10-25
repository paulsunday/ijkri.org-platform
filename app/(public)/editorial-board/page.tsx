import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

const ROLE_ORDER = [
  "Editor-in-Chief",
  "Managing Editor",
  "Associate Editor",
  "Section Editor",
  "Editorial Board Member",
  "Advisory Board Member",
  "Technical Editor",
  "Statistics Editor",
  "Language Editor",
  "Copy Editor",
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function roleRank(role: string | null) {
  if (!role) {
    return ROLE_ORDER.length;
  }

  const index = ROLE_ORDER.indexOf(role);

  return index === -1
    ? ROLE_ORDER.length
    : index;
}

export default async function EditorialBoardPage() {
  const journal = await prisma.journal.findFirst({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      shortName: true,
      description: true,
      contactEmail: true,
      editorialBoards: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            role: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
    },
  });

  const members = journal
    ? [...journal.editorialBoards].sort((a, b) => {
      const roleDifference =
        roleRank(a.role) - roleRank(b.role);

      if (roleDifference !== 0) {
        return roleDifference;
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name);
    })
    : [];

  const groupedMembers = ROLE_ORDER.map((role) => ({
    role,
    members: members.filter(
      (member) => member.role === role,
    ),
  })).filter((group) => group.members.length > 0);

  const otherMembers = members.filter(
    (member) =>
      !member.role ||
      !ROLE_ORDER.includes(member.role),
  );

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-400">
            Editorial Leadership
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Editorial Board
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Meet the scholars and professionals who support the editorial
            direction, peer-review quality and academic integrity of{" "}
            {journal?.name ||
              "the International Journal of Knowledge, Research and Innovation"}.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/about"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              About the Journal
            </Link>

            <Link
              href="/peer-review"
              className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white hover:text-slate-950"
            >
              Peer Review Policy
            </Link>

            <Link
              href="/reviewer/apply"
              className="rounded-lg px-6 py-3 font-semibold text-amber-300 transition hover:text-amber-200"
            >
              Become a Reviewer →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_320px]">
        <article>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Editorial Governance
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Independent academic oversight
          </h2>

          <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
            <p>
              The editorial board provides scholarly leadership and supports
              the journal&apos;s commitment to rigorous, ethical and
              transparent publishing.
            </p>

            <p>
              Board members contribute subject expertise, advise on journal
              policy, support peer-review quality and help maintain the
              relevance of the journal&apos;s multidisciplinary scope.
            </p>

            <p>
              Editorial decisions are expected to be based on academic merit,
              methodological quality, ethical compliance and contribution to
              knowledge.
            </p>
          </div>
        </article>

        <aside className="rounded-2xl border bg-slate-50 p-7">
          <h2 className="text-xl font-bold">
            Journal Information
          </h2>

          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Journal
              </dt>

              <dd className="mt-1 font-semibold">
                {journal?.name ||
                  "International Journal of Knowledge, Research and Innovation"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Short Name
              </dt>

              <dd className="mt-1 font-semibold">
                {journal?.shortName || "IJKRI"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Editorial Contact
              </dt>

              <dd className="mt-1 break-all font-semibold">
                {journal?.contactEmail ||
                  "editor@ijkri.org"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      {members.length === 0 ? (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h2 className="text-3xl font-bold">
                Editorial board profiles are being prepared
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                The journal is currently updating its editorial board
                information. Confirmed members will appear on this page after
                administrative approval.
              </p>

              <Link
                href="/contact"
                className="mt-8 inline-flex rounded-lg bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Contact the Editorial Office
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {groupedMembers.map((group, groupIndex) => (
            <section
              key={group.role}
              className={
                groupIndex % 2 === 0
                  ? "bg-slate-50"
                  : "bg-white"
              }
            >
              <div className="mx-auto max-w-7xl px-6 py-20">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Editorial Board
                  </p>

                  <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                    {group.role}
                  </h2>
                </div>

                <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {group.members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}

          {otherMembers.length > 0 && (
            <section className="bg-slate-50">
              <div className="mx-auto max-w-7xl px-6 py-20">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Editorial Team
                  </p>

                  <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                    Additional Board Members
                  </h2>
                </div>

                <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {otherMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7">
            <h2 className="text-xl font-bold text-amber-300">
              Editorial Independence
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              Editors are expected to make decisions independently and without
              improper influence from authors, institutions, sponsors or
              commercial interests.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7">
            <h2 className="text-xl font-bold text-amber-300">
              Conflict Management
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              Editors and reviewers must declare relationships or interests
              that may affect impartial assessment of a manuscript.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7">
            <h2 className="text-xl font-bold text-amber-300">
              Ethical Oversight
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              The editorial team supports appropriate responses to ethical
              concerns, corrections, complaints and potential breaches of
              publication integrity.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Contribute to IJKRI
            </p>

            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold">
              Support high-quality and ethical scholarly publishing
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Qualified scholars may apply to join the reviewer community or
              contact the editorial office regarding future editorial
              opportunities.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/reviewer/apply"
                className="rounded-lg bg-amber-500 px-7 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Become a Reviewer
              </Link>

              <Link
                href="/careers"
                className="rounded-lg bg-slate-950 px-7 py-3 font-semibold text-white hover:bg-slate-800"
              >
                View Opportunities
              </Link>

              <Link
                href="/contact"
                className="rounded-lg border border-slate-300 px-7 py-3 font-semibold hover:bg-slate-50"
              >
                Contact Editorial Office
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type Member = {
  id: string;
  name: string;
  title: string | null;
  affiliation: string | null;
  country: string | null;
  email: string | null;
  role: string | null;
  photoUrl: string | null;
  bio: string | null;
};

function MemberCard({
  member,
}: {
  member: Member;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        {member.photoUrl ? (
          <Image
            src={member.photoUrl}
            alt={member.name}
            width={800}
            height={600}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-950 text-5xl font-bold text-amber-400">
            {getInitials(member.name)}
          </div>
        )}
      </div>

      <div className="p-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">
          {member.role ||
            "Editorial Board Member"}
        </p>

        <h3 className="mt-3 text-2xl font-bold">
          {member.name}
        </h3>

        {member.title && (
          <p className="mt-2 font-medium text-slate-600">
            {member.title}
          </p>
        )}

        <div className="mt-4 space-y-1 text-sm text-slate-500">
          {member.affiliation && (
            <p>{member.affiliation}</p>
          )}

          {member.country && (
            <p>{member.country}</p>
          )}
        </div>

        {member.bio && (
          <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">
            {member.bio}
          </p>
        )}

        {member.email && (
          <a
            href={`mailto:${member.email}`}
            className="mt-6 inline-flex break-all font-semibold text-amber-700 hover:underline"
          >
            {member.email}
          </a>
        )}
      </div>
    </article>
  );
}
