CREATE TABLE "Group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" text NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "Opinion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" text NOT NULL,
	"groupId" uuid NOT NULL,
	"category" text NOT NULL,
	"body" text NOT NULL,
	"sourceLang" text NOT NULL,
	"bodyEn" text NOT NULL,
	"bodyJa" text NOT NULL,
	"authorKey" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "Profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" text NOT NULL,
	"name" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"linkedinUrl" text,
	"xUrl" text,
	"githubUrl" text,
	"ownerKey" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"passphraseHash" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"summaryEn" text,
	"summaryJa" text,
	"summaryCount" integer DEFAULT 0 NOT NULL,
	"summarizedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "Vote" (
	"opinionId" uuid NOT NULL,
	"voterKey" text NOT NULL,
	"sessionId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Vote_opinionId_voterKey_pk" PRIMARY KEY("opinionId","voterKey")
);


CREATE INDEX ASYNC "Group_sessionId_idx" ON "Group" ("sessionId");

CREATE INDEX ASYNC "Opinion_sessionId_createdAt_idx" ON "Opinion" ("sessionId","createdAt");

CREATE INDEX ASYNC "Profile_sessionId_idx" ON "Profile" ("sessionId");

CREATE INDEX ASYNC "Vote_sessionId_idx" ON "Vote" ("sessionId");