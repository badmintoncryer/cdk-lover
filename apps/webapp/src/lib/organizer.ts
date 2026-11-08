/**
 * The session host, pinned above the attendee directory and credited in the footer.
 * Static rather than a Profile row so it survives "Delete everything" and every new session.
 */
export const ORGANIZER = {
  name: 'Kazuho Cryer-Shinozuka',
  githubUrl: 'https://github.com/badmintoncryer',
  avatarUrl: 'https://github.com/badmintoncryer.png?size=160',
  intro: {
    ja: 'CDK Lovers の主催者',
    en: 'Host of CDK Lovers',
  },
  /** Second line under the intro; titles, so the same in both languages. */
  credentials: 'AWS Hero & AWS CDK Top Contributor & Trusted Community Reviewer',
  linkedinUrl: 'https://www.linkedin.com/in/cryershinozukakazuho/' as string | undefined,
  xUrl: 'https://x.com/nixieminton' as string | undefined,
};
