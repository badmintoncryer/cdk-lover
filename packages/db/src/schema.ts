import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** One run of the event (e.g. "1130", "1202"). */
export const sessions = pgTable('Session', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  /** HMAC of the passphrase; the plain value is never stored. */
  passphraseHash: text('passphraseHash').notNull(),
  /** 'open' accepts posts; 'closed' is read-only. */
  status: text('status').notNull().default('open'),
  summaryEn: text('summaryEn'),
  summaryJa: text('summaryJa'),
  summaryCount: integer('summaryCount').notNull().default(0),
  summarizedAt: timestamp('summarizedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});

export const groups = pgTable(
  'Group',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: text('sessionId').notNull(),
    name: text('name').notNull(),
    /** 'ja' | 'en' */
    language: text('language').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('Group_sessionId_idx').on(t.sessionId)],
);

export const opinions = pgTable(
  'Opinion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: text('sessionId').notNull(),
    groupId: uuid('groupId').notNull(),
    /** 'good' | 'bad' | 'wish' | 'other' */
    category: text('category').notNull(),
    body: text('body').notNull(),
    /** 'ja' | 'en' | other ISO code detected by the model */
    sourceLang: text('sourceLang').notNull(),
    bodyEn: text('bodyEn').notNull(),
    bodyJa: text('bodyJa').notNull(),
    /** Purpose-salted hash of the anonymous browser id; never joined with Profile. */
    authorKey: text('authorKey').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('Opinion_sessionId_createdAt_idx').on(t.sessionId, t.createdAt)],
);

/** Counted with GROUP BY instead of a counter column to avoid DSQL OCC conflicts on hot rows. */
export const votes = pgTable(
  'Vote',
  {
    opinionId: uuid('opinionId').notNull(),
    voterKey: text('voterKey').notNull(),
    sessionId: text('sessionId').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.opinionId, t.voterKey] }), index('Vote_sessionId_idx').on(t.sessionId)],
);

export const profiles = pgTable(
  'Profile',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: text('sessionId').notNull(),
    name: text('name').notNull(),
    intro: text('intro').notNull().default(''),
    linkedinUrl: text('linkedinUrl'),
    xUrl: text('xUrl'),
    githubUrl: text('githubUrl'),
    ownerKey: text('ownerKey').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('Profile_sessionId_idx').on(t.sessionId)],
);

export const sessionsRelations = relations(sessions, ({ many }) => ({
  groups: many(groups),
  opinions: many(opinions),
  profiles: many(profiles),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  session: one(sessions, { fields: [groups.sessionId], references: [sessions.id] }),
  opinions: many(opinions),
}));

export const opinionsRelations = relations(opinions, ({ one, many }) => ({
  session: one(sessions, { fields: [opinions.sessionId], references: [sessions.id] }),
  group: one(groups, { fields: [opinions.groupId], references: [groups.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  opinion: one(opinions, { fields: [votes.opinionId], references: [opinions.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  session: one(sessions, { fields: [profiles.sessionId], references: [sessions.id] }),
}));
