DO $$ BEGIN
 CREATE TYPE "language" AS ENUM('en', 'jp', 'ko', 'zh');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "manga_status" AS ENUM('ongoing', 'completed', 'hiatus', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "manga_type" AS ENUM('manga', 'manhwa', 'manhua', 'one_shot', 'doujinshi');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manga" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"alternative_titles" text[],
	"description" text,
	"author" text,
	"artist" text,
	"cover_image" text,
	"status" "manga_status" DEFAULT 'ongoing' NOT NULL,
	"type" "manga_type" DEFAULT 'manga' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"release_year" integer,
	"rating" real DEFAULT 0,
	"views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manga_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manga_genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"manga_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manga_genres_unique" UNIQUE("manga_id","genre_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manga_slug_idx" ON "manga" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manga_status_idx" ON "manga" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manga_type_idx" ON "manga" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manga_genres_manga_id_idx" ON "manga_genres" ("manga_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manga_genres_genre_id_idx" ON "manga_genres" ("genre_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manga_genres" ADD CONSTRAINT "manga_genres_manga_id_manga_id_fk" FOREIGN KEY ("manga_id") REFERENCES "manga"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manga_genres" ADD CONSTRAINT "manga_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
