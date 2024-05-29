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

// for application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

/**
 * NOTES ON STRUCTURE
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
 *
 * The date field in format of D D D  x:xx-x:xx period(am/pm)
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
  /**
   * 1. Figure out if user is logged in (DONE)
   *
   * 2. If so , check the clients request to add a class is successful (This is distingushed by
   *    whether or not the class is at maximum capacity or this class conflicts with a users
   *    schedule (to do this you must search the users current courses value)
   *
   * 3. An unique 6 digit combo is created if successful is reached
   *
   * 4. update the server with course enrollment
   *
   * 5. send back the code
   */

  // These are the two parameters to the form body object
  let userName = req.body.userName;
  let className = req.body.className;
  if(userName) {
    let query = "SELECT loginStatus FROM login WHERE username = ?;";
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
         */

        // Note that classname is guranteed to be filled as client picks a class to make a request
        let query2 = "SELECT * FROM classes WHERE name = ?;";
        let classInfo = await db.get(query2, className);
        if(classSeats !== null) {
          // The class does exist so now check its capacity
          let totalSeatsVal = classInfo.availableSeats;
          let toBeEnrolledCourseDate = classInfo.date;
          if(totalSeatsVal > 0) {

            // Update back avaibleseats count now
            let updateSeatCount = "UPDATE classes SET availableSeats = " + (totalSeatsVal - 1) +
                                  " WHERE name = ?;";
            let updateDBSeatCount = await db.get(updateSeatCount, className);

            // No need to use the variable (look later to remove it)

            // The student can enroll meets the space requirements so now check schedule conflict

            // Getting users JSON String currentCourses from database
            let query3 = "SELECT currentCourses FROM userCourses WHERE username = ?;";
            let inClassInDB = await db.get(query3, userName);

            // Santitizing the data into workable form
            let currentCoursesJSONString = inClassInDB.currentCourses;
            let currentCoursesJSOB = JSON.parse(currentCoursesJSONString);
            let currentCourseKeyArr = Object.keys(currentCoursesJSOB);

            // Check all the dates of the object
            let conflictInSchedule = false;
            for (let i = 0; i < currentCourseKeyArr.length; i += 1) {
              let currentCourseDateEncode = key.date;

              // Split on double space which results in the time and days
              let selectedCourseDateSplit = toBeEnrolledCourseDate.split("  ");
              let currentCourseDateSplit = currentCourseDateEncode.split("  ");

              // Storing days and times for both dates to compare
              let selectedCourseDays = selectedCourseDateSplit[0];
              let selectedCourseTimes = selectedCourseDateSplit[1];
              let currentCourseDays = currentCourseDateSplit[0];
              let currentCourseTimes = currentCourseDays[1];

              // Splitting individual dates among each other
              let selectedCourseDaysSplit = selectedCourseDays.split(" ");
              let currentCourseDaysSplit = currentCourseDays.split(" ");


              /**
               * Check each day the to be enrolled course takes places against logged in user
               * current course days
               */
              for(let j = 0; j < selectedCourseDaysSplit.length; j += 1) {
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

            // No over lap takes place so add course to user course schedule
            if (!conflictInSchedule) {
              /**
               * 1.) add the class as an information a key value pair into current courses schedule
               *    (DONE)
               * 2.) Update the backend file with new course schedule (DONE)
               * 3.) Send back unique code (STILL DO)
              */
              res.text("text").status(SUCCESS_CODE)
                .send("Successfully added course");

              // Adding new key class into course list
              currentCoursesJSOB.className = { date: toBeEnrolledCourseDate,
                                               subject: classInfo.subject,
                                               description: classInfo.description
                                              };
              let updatedCurrentCoursesString = JSON.stringify(currentCoursesJSOB);


              // Update back course schedule in backend now
            let updateCourseQuery = "UPDATE userCourses SET currentCourses = " +
                                    updatedCurrentCoursesString + " WHERE username = ?;";

            // Updated the query (Remove this later)
            let userCoursesUpdated = await db.get(updateCourseQuery, userName);


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
