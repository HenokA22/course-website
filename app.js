"use strict";

const express = require("express");
const app = express();
const multer = require("multer");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const cookieParser = require("cookie-parser");
// how to use cookie parser: https://github.com/expressjs/cookie-parser
const SUCCESS_CODE = 200;
const SERVER_ERROR_CODE = 500;
const USER_ERROR_CODE = 400;
const DEFAULT_PORT = 8000;
let confirmationCodes = new Set();

/**
 * Going to be an array of JS objects that represent a key value pairing between transactions and
 * a users current courses
 *
 */
let courseHistory = [];

// for application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

let obj = {"Intermediate Expository Writing": { "date": "T Th  9:30-10:30 am",
                                              "subject": "English",
                                              "description": "Writing papers communicating information and opinion to develop accurate, competent, and effective expression."}
                                            };


/**
 * NOTES ON STRUCTURE of various attributes in the database
 * The of the value of a currentCourse field in the data base should be an array of json objects with it key the name of class on the users schedule and the value another json object holding infromation about the key
 * the name
 *
 * {
 *  name (name of class from classes table) : {
 *                                                date(recieved from classes table): value
 *                                                subject(recieved from classes table): value
 *                                                description(recieved from classes table): value
 *                                            }
 * }
 *
 * {
 *  currentCourses:
 *
 *  cse154: {
 *    date:
 *    subject:
 *    description:
 *    seats:
 *  }
 *
 * }
 *
 *
 *
 * The date field in format of D D D  x:xx-x:xx period(am/pm)
 *
 * course history: Each value is formated as an Array of JS objects that are in the form
 * {
 *   transactionCode: currentCourseObject (The value from the "currentCourses" attribute in the db);
 * }
 */

/** Reterieves all the classes alongside their information from the database */
app.get("/getItems", async function(req, res) {
  let query = "SELECT * FROM classes ORDER BY name DESC;";
  try {
    let db = await getDBConnection();
    let result = await db.all(query);
    let finish = {
      "classes": result
    };
    res.json(finish);
    await closeDbConnection(db);
  } catch (error) {
    res.type("text").status(SERVER_ERROR_CODE)
      .send("An error occurred on the server. Try again later.");
  }
});

/** Checks whether or not a user login is successful  */
app.post("/login", async function(req, res) {
  // Check if username and passaword are in database
  let username = req.body.username;
  let password = req.body.password;

  // This is a boolean flag that lets backend know if username should be saved
  let savePassWord = req.body.savePassWord;


  if (username && password) {
    let query = "SELECT * FROM login WHERE username = ? AND password = ?;";
    try {
      let db = await getDBConnection();
      let result = await db.get(query, [username, password]);
      if (result !== undefined) {
        /**
         * here we know the login is possible
         * we can now update the login status
         */
        let updateQuery = "UPDATE login SET loginStatus = ? WHERE username = ? AND password = ?;";
        await db.run(updateQuery, ["true", username, password]);

        // Saving username to browser if user has said so
        if(savePassWord) {
          let grabbingUserID = "SELECT id FROM userCourses WHERE username = ?;"
          let userIDObj = await db.get(grabbingUserID, username);
          let userID = userIDObj.id;

          // Saving username in localstorage based on user id
          window.localStorage.setItem("User " + userID + " username", username);
        }
        await closeDbConnection(db);

        res.type("text").status(SUCCESS_CODE)
          .send("Login successful");
      } else {
        res.type("text").status(USER_ERROR_CODE)
          .send("Login failed. Invalid user.");
      }
    } catch (error) {
      // an error occured with one of the queries here
      // Change this later
      console.log(error);
    }
  } else {
    // Case such that user didn't add there username or password.
    res.type("text").status(USER_ERROR_CODE)
      .send("Username or Password is empty, please try again");
  }
});

// Feature #3 (Similar to feature one but restricted to one row)
app.get("/itemDetails/:className", async function(req, res) {
  /**
   * Get further information about an item, should be in the form of a JSON object
   */
  let className = req.params.className;

  // However this conditional should always pass as it would only execute on a callback
  if (className) {
    try {
      let query = "SELECT * FROM classes WHERE name = ?;";
      let db = await getDBConnection();
      let result = await db.get(query, req.params.className);
      if (result !== undefined) {
        // removing id key because it isn't needed
        delete result.id;
        res.json(result);
        await closeDbConnection(db);
      } else {
        // May change later
        res.type("text").status(SERVER_ERROR_CODE)
          .send("An error occurred on the server. Try again later.");
      }
    } catch (error) {
      res.type("text").status(SERVER_ERROR_CODE)
      .send("An error occurred on the server. Try again later.");
    }
  } else {
    res.type("text").send(USER_ERROR_CODE)
      .send("No item specified");
  }
});

// Feature #4 (Testing is needed to check if SQL joins and new queries are working correctly)
app.post("/enrollCourse", async function(req, res) {

  // These are the two parameters to the form body object
  let userName = req.body.userName;
  let className = req.body.className;
  if(userName) {
    // Checking the login status
    let query = "SELECT loginStatus FROM login WHERE username = ?;";
    // have a way to denote whether or not the user is signed in.
    try {
      let db = await getDBConnection();
      let result = await db.get(query, userName);

      // Extracting the text (true / false)
      let isUserLogin = result.loginStatus;

      if(isUserLogin === "true") {

        // Note that classname is guranteed to be filled as client picks a class to make a request
        let query2 = "SELECT * FROM classes WHERE name = ?;";
        let classInfo = await db.get(query2, className);
        if(classInfo !== undefined) {

          // The class does exist so now check its capacity, the date is grabbed to be used later
          let totalSeatsVal = classInfo.availableSeats;
          let toBeEnrolledCourseDate = classInfo.date;

          // Checking if space availability is valid
          if(totalSeatsVal > 0) {

            // The student can enroll meets the space requirements so now check schedule conflict
            let query3 = "SELECT c.name FROM userCourses u JOIN classes c ON " +
                          "c.name = u.takingCourse WHERE username = ?;";
            let classResult = await db.all(query3, userName);

            // An array of classes that the user is currently taking
            let currentCourses = [];

            // Transfering db.all result -> values of objects inside of array
            for (let i = 0; i < classResult.length; i += 1) {
              let oneMatch = classResult[i];
              currentCourses.push(oneMatch.name);
            }

            // Check all the dates of each class
            let conflictInScheduleResult = await checkConflict(db, toBeEnrolledCourseDate, currentCourses);

            /**
             * No over lap takes place therefore the following code function is to add a course to
             * users schedule
             */
            if (!conflictInScheduleResult) {
              /**
               * Last check, does the user already have this class in their course history
               */
               // can't you do a query?
               // "[hi, casted, string]"
               // call parse-> [hi, casted, string]
              let addingAnNewClass = true;
              for (let i = 0; i < currentCourses.length; i += 1) {
                // Check for if a class that this user is taking matches the requested class to add
                if (currentCourses[i] === className) {
                  addingAnNewClass = false;
                  i = currentCourses.length;
                }
              }

              // Passed all conditions therefore updating the database is being represented below
              if (addingAnNewClass) {
                 // move this around
                 // Updating the database available seat count now
                let updateSeatCount = "UPDATE classes SET availableSeats = " + (totalSeatsVal - 1) +
                                      " WHERE name = ?;";
                await db.run(updateSeatCount, className);

                // No need to store metadata into a variable (look later to remove it)

                // Insert the course schedule in backend now
                // First get major value from database
                let majorQuery = "SELECT major FROM userCourses WHERE username = ?;";
                let majorResult = await db.get(majorQuery, userName);
                let userMajor = majorResult.major;

                // Now updating the database to reflect all new course on the backend
                let sql="INSERT INTO userCourses (username, takingCourse, major) VALUES (?, ?, ?);";
                await db.run(sql, [userName, className, userMajor]);

                // Creating the confirmation code below
                let newCode = "";
                let invalidCode = true;

                // While loop checks if the code is invalid or not
                while (invalidCode) {
                  newCode = "";
                  for (let i = 0; i < 6; i += 1) {
                    // Picking a random ascii value from dec 33 to 126
                    let randomNumInRange = Math.floor(Math.random() * (126 - 33 + 1) + 33);
                    let randomAsciiVal = String.fromCharCode(randomNumInRange);
                    newCode += randomAsciiVal;
                  }

                  // Valid check
                  if (!(confirmationCodes.has(newCode))) {
                    confirmationCodes.add(newCode);
                    invalidCode = false;
                  }
                }

                // Gather all the information for each course and add it courseHistory array

                /**
                 * Grabing information from each course the student take putting that into an object
                 * Then applying then assembling that into a larger array that represents what the
                 * student is currently taking.
                 */
                let studentClasses = await getStudentClassesInfo(db, currentCourses);

                /**
                 * adding new "transaction(adding a class) to be mapped to a user up to date
                 * course schedule.
                 */
                let newTransactionKey = "" + newCode;
                let newTransactionStamp = {[newTransactionKey]:  studentClasses};
                courseHistory.push(newTransactionStamp);

                await closeDbConnection(db);
                // Append confirmation code
                res.type("text").status(SUCCESS_CODE)
                .send("Successfully added course, this is the confirmation code: " + newCode);
              }
            } else {
              res.type("text").status(USER_ERROR_CODE)
               .send("A conflict in your schedule has occured");
            }
          } else {
            res.type("text").status(USER_ERROR_CODE)
              .send("This course is add capacity. Cannot enroll");
          }
        } else {
          res.type("text").status(USER_ERROR_CODE)
            .send("This class does not exist");
        }
      } else {
        res.type("text").status(USER_ERROR_CODE)
          .send("You are not logged in. Please sign in");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  } else {
    /**
     * I am gonna assume that if a username isn't found then the user is not logged in
     * The implementation of what body params that get send back is going to depend on how this
     * is hooked up on the front end.
     */

    res.type("text").status(USER_ERROR_CODE)
      .send("No username is specified. Please login in before trying to adding a class")
  }
});

/**
 * Retrieves information about each course the student is currently taking.
 * @param {Object} db - The SQLite database connection.
 * @param {String[]} currentCourses - Array containing names of current courses.
 * @returns {Promise<Array>} - A Promise that resolves to an array of objects,
 * where each object contains information about a course.
 */
async function getStudentClassesInfo(db, currentCourses) {
  try {
    // Array to store information about each course the student is taking
    let studentClasses = [];

    // Loop through each current course
    for (let i = 0; i < currentCourses.length; i += 1) {

      // Query to get information about the current course
      let classInfoQuery = "SELECT date, availableSeats, subject, description FROM classes WHERE name = ?";

      // Execute the query to get class information
      let classInfoResult = await db.get(classInfoQuery, currentCourses[i]);

      // Create a snapshot object for the current course and add it to studentClasses array
      let newCourseHistorySnapShot = { [currentCourses[i]]: classInfoResult };
      studentClasses.push(newCourseHistorySnapShot);
    }

    return studentClasses;
  } catch (error) {
    console.error("Error", error);
  }
}

/**
 * Checks if there is a time conflict between two classes
 * @param {sqlite3.Database} db - The database object for the connection
 * @param {String} toBeEnrolledCourseDate - The dates that the request enrolled date
 *                                      lies on.
 * @param {String[]} currentCourses - An array of course that the user is current taking
 * @return - A boolean representing if a conflict does indeed occur, true if so, if not false
 */
async function checkConflict(db, toBeEnrolledCourseDate, currentCourses) {
  let conflictInSchedule = false;
  try {
    for (let i = 0; i < currentCourses.length; i += 1) {
      let santizedInfo = await parsingOutDates(db, toBeEnrolledCourseDate, currentCourses[i]);
      console.log(santizedInfo);

       /**
        * Check each day the to be enrolled course takes places against logged in user
        * current course days
        */
       for (let j = 0; j < santizedInfo[2].length; j += 1) {
         // compares for every day in the selectedCourse we want to enroll
         // make sure if one of the days is equal
         if ((santizedInfo[3]).includes((santizedInfo[2])[j])) {
           // Checking if two times on the same day overlap
           conflictInSchedule = timesOverlap(santizedInfo[0], santizedInfo[1]);
           if (conflictInSchedule) {
             // Exit both loops since conflict has been found
             i = currentCourses.length;
             j = santizedInfo[2].length;
           }
         }
       }
     }
     return conflictInSchedule;
  } catch (error) {
    console.error("Error", error);
  }
}

/**
 * Retrives the dates and times of both a current class a student is taking and the enrolled one
 * the student plans on taking.
 * @param {sqlite3.Database} db - The database object for the connection
 * @param {String} toBeEnrolledCourseDate - The dates that the request enrolled date
 *                                      lies on.
 * @param {String} currentCourse - A course that the logged in user is taking
 * @returns An array of santatized day and time information for both class the user is taking and
 *          request classes
 */
async function parsingOutDates(db, toBeEnrolledCourseDate, currentCourse) {
  try {
    // Accessing the nested date value from result of .get()
    let dateQuery = "SELECT date FROM classes WHERE name = ?;"
    let dateResultOB = await db.get(dateQuery, currentCourse);
    let date = dateResultOB.date;

    let selectedCourseDateSplit = toBeEnrolledCourseDate.split("  ");
    let currentCourseDateSplit = date.split("  ");

    // Storing days and times for both dates to compare
    let selectedCourseDays = selectedCourseDateSplit[0];
    let selectedCourseTimes = selectedCourseDateSplit[1];
    let currentCourseDays = currentCourseDateSplit[0];
    let currentCourseTimes = currentCourseDateSplit[1];

    // Splitting individual dates among each other
    // courseDays: [M, W, T] (users course)
    // currentCourseDays: [T, Th] (to be enrolled course)
    //    - represents the entire history of users courses they've enrolled
    let selectedCourseDaysSplit = selectedCourseDays.split(" ");
    let currentCourseDaysSplit = currentCourseDays.split(" ");

    let returnArr = [];
    returnArr.push(selectedCourseTimes);
    returnArr.push(currentCourseTimes);
    returnArr.push(selectedCourseDaysSplit);
    returnArr.push(currentCourseDaysSplit);
    return returnArr;
  } catch (error) {
    // Handle error later;
  }
}

// Feature #5
app.get("/searchClass/:className", async function(req, res) {
  /**
   * 1. process query parameters , (course level, subject of class, credits)
   *     - Later possibly implement an option for to display all classes that match filter options
   * 2. Grab information from data base, and place into a JSON object
   *
   * 3. send information back  to the client
   */
});

// Feature #6
app.get("/viewTransaction", async function(req, res) {
  /**
   * 1. Check if user is logged in
   *
   * 2. Grab (transaction history ) schedule history from database?
   */
});

function isObject(value) {
  return value !== null && typeof value === 'object';
}

/**
 * Converts a 12-hour format time (e.g., "9:30 am") to the number of minutes since midnight.
 * @param {string} time - The time in 12-hour format (e.g., "9:30 am" or "10:00 pm").
 * @returns {number} - The number of minutes since midnight.
 */
function convertToMinutes(time) {
  // Split the time into the main time part and the period (am/pm)
  let [timePart, period] = time.split(" ");
  // Split the main time part into hours and minutes
  let [hours, minutes] = timePart.split(":").map(Number);

  // Convert hours to 24-hour format if period is pm and it's not 12 pm
  if (period === "pm" && hours !== 12) {
    hours += 12;
  // Convert hours to 0 if period is am and it's 12 am
  } else if (period === "am" && hours === 12) {
    hours = 0;
  }

  // Return the total minutes since midnight
  return hours * 60 + minutes;
}

/**
 * Parses a time range string (e.g., "9:30-10:30 am") into an object with start and end times in minutes since midnight.
 * @param {string} timeRange - The time range in the format "x:xx-x:xx am/pm".
 * @returns {Object} - An object with the start and end times in minutes since midnight.
 */
function parseTimeRange(timeRange) {
  // Split the time range into start and end times
  let [startTime, endTime] = timeRange.split("-");
  // Convert the start and end times to minutes since midnight
  return {
    start: convertToMinutes(startTime),
    end: convertToMinutes(endTime)
  };
}

/**
 * Checks if two time ranges overlap.
 * @param {string} range1 - The first time range in the format "x:xx-x:xx am/pm".
 * @param {string} range2 - The second time range in the format "x:xx-x:xx am/pm".
 * @returns {boolean} - True if the time ranges overlap, false otherwise.
 */
function timesOverlap(range1, range2) {
  // Parse the first time range into start and end times in minutes since midnight
  // An object
  const { start: start1, end: end1 } = parseTimeRange(range1);
  // Parse the second time range into start and end times in minutes since midnight
  const { start: start2, end: end2 } = parseTimeRange(range2);

  // Check if the time ranges overlap
  return start1 < end2 && start2 < end1;
}

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns {sqlite3.Database} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "myplan.db",
    driver: sqlite3.Database
  });
  return db;
}

/**
 * Closes the database connection.
 * @param {sqlite3.Database} db - The database connection.
 */
async function closeDbConnection(db) {
  try {
    await db.close();
  } catch (error) {
    console.error("Failed to close the database connection:", error);
  }
}


// tells the code to serve static files in a directory called 'public'
app.use(express.static('public'));
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);
