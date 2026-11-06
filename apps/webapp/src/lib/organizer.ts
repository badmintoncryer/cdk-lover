/**
 * The session host, pinned above the attendee directory and credited in the footer.
 * Static rather than a Profile row so it survives "Delete everything" and every new session.
 */
export const ORGANIZER = {
  name: 'Kazuho Shinozuka',
  githubUrl: 'https://github.com/badmintoncryer',
  avatarUrl: 'https://github.com/badmintoncryer.png?size=160',
  intro: {
    ja: 'CDK Lover の主催者。このサイトも作りました 💜',
    en: 'Host of CDK Lover, and the one who built this site 💜',
  },
  linkedinUrl: 'https://www.linkedin.com/in/cryershinozukakazuho/' as string | undefined,
  xUrl: 'https://x.com/nixieminton' as string | undefined,
};
