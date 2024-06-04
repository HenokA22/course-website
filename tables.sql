CREATE TABLE "classes" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL,
	"description"	TEXT NOT NULL,
	"avgGPA"	INTEGER,
	"subject"	TEXT NOT NULL,
	"availableSeats"	INTEGER NOT NULL,
	"date"	TEXT NOT NULL,
	"courseLevel"	INTEGER NOT NULL,
	"credits"	INTEGER NOT NULL,
	"shortName"	TEXT NOT NULL,
	"totalSeats"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "login" (
	"username"	TEXT,
	"password"	INTEGER NOT NULL,
	"loginStatus"	TEXT NOT NULL,
	"major"	INTEGER NOT NULL,
	PRIMARY KEY("username")
);

CREATE TABLE "sqlite_sequence" (
	"name"	,
	"seq"
);

CREATE TABLE "userCourses" (
	"classId"	INTEGER NOT NULL,
	"username"	TEXT NOT NULL,
	"takingCourse"	TEXT,
	PRIMARY KEY("classId"),
	FOREIGN KEY("username") REFERENCES "login"("username")
);