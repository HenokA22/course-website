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
        res.type("text").status(SUCCESS_CODE)
          .send("Login successful");

        // Saving username to browser if user has said so
        if(savePassWord) {
          let grabbingUserID = "SELECT id FROM userCourses WHERE username = ?;"
          let userIDObj = await db.get(grabbingUserID, username);
          let userID = userIDObj.id;

          // Saving username in localstorage based on user id
          window.localStorage.setItem("User " + userID + " username", username);
        }
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

// Feature #4
app.post("/enrollCourse", async function(req, res) {
  let obj = {"Intermediate Expository Writing": { "date": "T Th  9:30-10:30 am",
                                              "subject": "English",
                                              "description": "Writing papers communicating information and opinion to develop accurate, competent, and effective expression."}
                                            };


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
        /**
         * Check if user can add class
         * 1.) Does this class exists
         *
         * 2.) Is there capacity
         *
         * 3.) does it conflict with users schedule
         *
         * 4.) Lastly does the user already have it in their schedule
         */

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

            /**
             * Getting an array of all the courses that the user is currently taking as a value of
             * attrubute name
             */
            let query3 = "SELECT c.name FROM userCourses u, classes c WHERE " +
                          "c.name = u.takingCourse AND username = ?;";
            let classResult = await db.all(query3, userName);

            let keyArray =

            // Santitizing the data into workable form
            let currentCoursesJSONString = inClassInDB.currentCourses;
            console.log(currentCoursesJSONString);
            let currentCoursesJSOB = JSON.parse(currentCoursesJSONString);

            // A array of keys to access each course in the users schedule
            // Keys are the class name


            // The JSON string check isn't working properely

            console.log(currentCoursesJSOB["Intermediate Expository Writing"]);
            // Error here ( how to print the keys of a JS object)
            let currentCourseKeyArr = Object.keys(currentCoursesJSOB);

            //console.log(currentCourseKeyArr);
            // Check all the dates of the object
            let conflictInSchedule = false;
            for (let i = 0; i < currentCourseKeyArr.length; i += 1) {
              /**
              console.log("before checking the date value");
              console.log(currentCoursesJSOB);
              console.log(currentCourseKeyArr);
              console.log(currentCourseKeyArr[i]); // Debugging from here */

              // Accessing the nested date value inside of the current courses date object
              let currentCourseDateEncode = currentCoursesJSOB.currentCourseKeyArr[i].date;

              console.log("After the valid processing of current JSOB courses");

              // Split on double space which results in the time and days
              // check to see if .split on mutliple spaces will either count as one
              // or two.
              let selectedCourseDateSplit = toBeEnrolledCourseDate.split("  ");
              let currentCourseDateSplit = currentCourseDateEncode.split("  ");

              // Storing days and times for both dates to compare
              let selectedCourseDays = selectedCourseDateSplit[0];
              let selectedCourseTimes = selectedCourseDateSplit[1];
              let currentCourseDays = currentCourseDateSplit[0];
              let currentCourseTimes = currentCourseDays[1];

              // Splitting individual dates among each other
              // courseDays: [M, W, T] (users course)
              // currentCourseDays: [T, W] (to be enrolled course)
              //    - represents the entire history of users courses they've enrolled
              let selectedCourseDaysSplit = selectedCourseDays.split(" ");
              let currentCourseDaysSplit = currentCourseDays.split(" ");

              console.log("After santizing yourself");


              /**
               * Check each day the to be enrolled course takes places against logged in user
               * current course days
               */
              for(let j = 0; j < selectedCourseDaysSplit.length; j += 1) {
                // compares for every day in the selectedCourse we want to enroll
                // make sure if one of the days is equal
                if (currentCourseDaysSplit.includes(selectedCourseDaysSplit[j])) {
                  // Checking if two times on the same day overlap
                  conflictInSchedule = timesOverlap(selectedCourseTimes, currentCourseTimes);
                  if (conflictInSchedule) {
                    // Exit both loops since conflict has been found
                    i = selectedCourseDaysSplit.length;
                    j = currentCourseKeyArr.length;
                    res.type("text").status(USER_ERROR_CODE)
                      .send("A conflict in your schedule has occured");
                  }
                }
              }
            }

            /**
             * No over lap takes place therefore the following code function is to add a course to
             * users schedule
             */
            if (!conflictInSchedule) {
              /**
               * Last check, does the user already have this class in their course history
               */
               // can't you do a query?
               // "[hi, casted, string]"
               // call parse-> [hi, casted, string]
              let addingAnNewClass = true;
              for (let i = 0; i < currentCourseKeyArr.length; i += 1) {
                // Check for if a class that this user is taking matches the requested class to add
                if (currentCourseKeyArr[i] === className) {
                  addingAnNewClass = false;
                  i = currentCourseKeyArr.length;
                }
              }

              // Passed all conditions therefore updating the database is being represented below
              if (addingAnNewClass) {

                 // move this around
                 // Updating the database available seat count now
                let updateSeatCount = "UPDATE classes SET availableSeats = " + (totalSeatsVal - 1) +
                                      " WHERE name = ?;";
                let updateDBSeatCount = await db.run(updateSeatCount, className);

                // No need to store metadata into a variable (look later to remove it)

                // Adding new key (class) into current course object
                currentCoursesJSOB.className = { "date": toBeEnrolledCourseDate,
                              "subject": classInfo.subject,
                              "description": classInfo.description
                            };
                let updatedCurrentCoursesString = JSON.stringify(currentCoursesJSOB);

                // Updating the course schedule in backend now
                let updateCourseQuery = "UPDATE userCourses SET currentCourses = " +
                  updatedCurrentCoursesString + " WHERE username = ?;";

                // Updated the query (Remove this later)
                let userCoursesUpdated = await db.run(updateCourseQuery, userName);


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

                // Now update the current course history
                let courseHistoryQuery = "SELECT courseHistory FROM userCourses WHERE username = ?";
                let courseHistoryJS = await db.get(courseHistoryQuery, userName);

                // Santitzing the data
                let courseHistoryArrString = courseHistoryJS.courseHistory;
                let courseHistoryArr = JSON.parse(courseHistoryArrString);

                // adding new "transaction to the js object"
                let newTransactionKey = "" + newCode;
                let newTransactionStamp = {[newTransactionKey]: currentCoursesJSOB }
                courseHistoryArr.push(newTransactionStamp);

                // Putting back the updated current courses into the database
                let updatedCourseHistoryString = JSON.stringify(courseHistoryArr);
                let updateDBCourseHistoryQuery = "UPDATE userCourses SET courseHistory =  " +
                            updatedCourseHistoryString + " WHERE username = ?";
                let resultOfCourseHistoryUpdate = await db.run(updateDBCourseHistoryQuery,userName);

                await db.close;
                // Append confirmation code
                res.text("text").status(SUCCESS_CODE)
                .send("Successfully added course, this is the confirmation code: " + newCode);
              }
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
