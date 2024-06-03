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
  let query = "SELECT * FROM classes " +
              "GROUP BY shortName " +
              "ORDER BY name DESC;";
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

/** Signs out the user and updates the login status of that user to false. */
app.post("/signout", async function(req, res) {
  let username = req.body.username;
  let password = req.body.password;
  if (username && password) {
    let query = "SELECT * FROM login WHERE username = ? AND password = ?;";
    try {
      let db = await getDBConnection();
      let result = await db.get(query, [username, password]);
      if (result !== undefined) {
        let updateLoginStatus = "UPDATE login SET loginstatus = ? WHERE username = ? AND password = ?;";
        await db.run(updateLoginStatus, ["false", username, password]);

        await closeDbConnection(db);

        res.type("text").status(SUCCESS_CODE)
          .send("Signout successful");
      } else {
        res.type("text").status(USER_ERROR_CODE)
          .send("Signout failed.");
      }
    } catch (error) {
      console.log(error);
    }
  } else {
    res.type("text").status(USER_ERROR_CODE)
      .send("Username or Password is empty, please try again");
  }
});

/** Checks whether or not a user login is successful  */
app.post("/login", async function(req, res) {
  // Check if username and passaword are in database
  let username = req.body.username;
  let password = req.body.password;

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
      let query = "SELECT * FROM classes WHERE shortName = ?;";
      let db = await getDBConnection();
      let result = await db.all(query, req.params.className);
      if (result.length !== 0) {
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

// Feature #4 Determines if a logged in user can enroll in a course
app.post("/enrollCourse", async function(req, res) {

  // These are the two parameters to the form body object
  let userName = req.body.userName;
  let className = req.body.className;
  let classId = req.body.id;
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
        let query2 = "SELECT * FROM classes WHERE shortName = ? AND id = ?;";
        let classInfo = await db.get(query2, [className, classId]);
        if(classInfo !== undefined) {

          // The class does exist so now check its capacity, the date is grabbed to be used later
          let totalSeatsVal = classInfo.availableSeats;
          let toBeEnrolledCourseDate = classInfo.date;
          // Checking if space availability is valid
          if(totalSeatsVal > 0) {

            // The student can enroll meets the space requirements so now check schedule conflict
            let query3 = "SELECT takingCourse, classId FROM userCourses WHERE username = ?;";
            let classResult = await db.all(query3, userName);
            // An array of classes that the user is currently taking
            let currentCourses = [];

            // Transfering db.all result -> values of objects inside of array
            for (let i = 0; i < classResult.length; i += 1) {
              let oneMatch = classResult[i];
              currentCourses.push(oneMatch);
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
                if (currentCourses[i].takingCourse === className) {
                  addingAnNewClass = false;
                  i = currentCourses.length;
                }
              }
              // Passed all conditions therefore updating the database is being represented below
              if (addingAnNewClass) {

                // Test this later
                let newCode = await helperFunction(db, className, userName, currentCourses, classId);
                res.type("text").status(SUCCESS_CODE)
                .send("Successfully added course, this is the confirmation code: " + newCode);
              } else {
                res.type("text").status(USER_ERROR_CODE)
                  .send("Cannot enroll in a class you have already enrolled.");
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
      .send("No username is specified. Please login in before trying to adding a class");
  }
});

// Performs a search on the data base for classes that match the search term and filters.
// ?className=x,date=x,subject=x,credits=x,courseLevel=x (Format of query parameters)
app.get("/search", async function(req, res) {
  let className = req.query.className;
  let date = req.query.date; // Checkbox on the front end: M W F in an array as a string
  let subject = req.query.subject; // an array of subjects as an string
  let credits = req.query.credits; // an array of credits as a string
  let courseLevel = req.query.courseLevel // An array course level on the front end as a string
  let query = "";
  let classQueryUsed = false;

  // All possible filters
  let filterAll = [date, subject, credits, courseLevel];

  // Names for each of the values in the filter all array lined accordingly
  let filterNames = ["date", "subject", "credits", "courseLevel"];
  let validFilters = [];

  // Checking which filters are actually used
  for (let i = 0; i < filterAll.length; i += 1) {
    if (filterAll[i] !== undefined) {
      let specificFilterArr = JSON.parse(filterAll[i]);

      // Add column name to the front of each the values of the filter
      specificFilterArr.unshift(filterNames[i]);

      /**
       * Adding an column name to the zeros index of each array
       */
      validFilters.push(specificFilterArr);
    }
  }

  if(className) {
    classQueryUsed = true;

    // Regular expression used to match any digit
    const regex = /\d/;

    // Test to see if search term is a short name or full name of a class
    if(regex.test(className)) {

      // Search used shortname
      query += "SELECT * FROM classes WHERE (shortName = ?";
      query = applyFiltersToQuery(query, validFilters);
    } else {
      query += "SELECT * FROM classes WHERE (name = ?";

      // Regular class name used in search
      query = applyFiltersToQuery(query, validFilters);
    }
  } else {

    // reconstruct query based off data
    query = "SELECT * FROM classes WHERE (";
    query = applyFiltersToQuery(query, validFilters);
  }

  try {
    let db = await getDBConnection();

    /**
     * Ternary operator is used to distingush whether or not the a search term was used in the
     * search bar.
     */
    let result = classQueryUsed ? await db.all(query, className) : await db.all(query);

    // Empty query means that the user has mistakenly inputed data
    if (result.length === 0) {
      throw new Error("Invalid Query");
    }
    let matchingSearchClasses = {"classes": result};
    res.json(matchingSearchClasses);
  } catch (error) {
    if (error.message === "Invalid Query") {
      res.type("text").status(USER_ERROR_CODE)
        .send("Invalid class name specified");
    } else {
      res.type("text").status(SERVER_ERROR_CODE)
        .send("An error occurred on the server. Try again later.");
    }
  }
});

/*  PUT THIS HELPER METHOD IN THE FUNCTION LATER

/**
 * Creates an full query depending on the search / filter conditions specified
 * @param {String} className - The name of specified class
 * @param {boolean} classQueryUsed - A boolean flag representing whether the search contains
 *                                    a class name.
 * @param {String} query - An string representing a empty query
 * @param {String[][]} validFilters - A 2D array containing information about the
 * @returns - A newly assembled Query
 / // fix lateer
function createQuery(className, classQueryUsed, query, validFilters) {

  if(className) {
    classQueryUsed = true;

    // Regular expression used to match any digit
    const regex = /\d/;

    // Test to see if search term is a short name or full name of a class
    if(regex.test(className)) {

      // Search used shortname
      query += "SELECT * FROM classes WHERE (shortName = ?";
      query = applyFiltersToQuery(query, validFilters);
    } else {
      query += "SELECT * FROM classes WHERE (name = ?";

      // Regular class name used in search
      query = applyFiltersToQuery(query, validFilters);
    }
  } else {

    // reconstruct query based off data
    query = "SELECT * FROM classes WHERE (";
    query = applyFiltersToQuery(query, validFilters);
  }

  return query;
}

*/

/**
 * Applies filters to a translated search query from the UI
 * @param {String} query - A select statement without filters
 * @param {Array} validFilters - An array of all the filters to apply on the query
 * @returns - Completed search query with filters applied
 */
function applyFiltersToQuery(query, validFilters) {
  // This double for loop generates the search/filter query
  for (let i = 0; i < validFilters.length; i += 1) {
    let nameAndValuesForAFilter = validFilters[i];
    let name = nameAndValuesForAFilter[0];

    // traversing the values of a filter
    for (let j = 1; j < nameAndValuesForAFilter.length; j += 1) {

      // The query structure differs based on if the date filter is applied.
      if (name === "date") {
        //console.log(nameAndValuesForAFilter[j]);
        console.log(nameAndValuesForAFilter);
        query += name + " LIKE \"%" +  nameAndValuesForAFilter[j] + "%\"";
      } else if (name === "subject") {
        query += name + " = " + "\"" + nameAndValuesForAFilter[j] + "\"";
      } else {
        query += name + " = " + nameAndValuesForAFilter[j];
      }

      // Checking whether or not another filter options is needed
      if (j !== (nameAndValuesForAFilter.length - 1)) {
        query += " OR ";
      }
    }

    // Complete of the filters applied portion of the query with a closing parenthesis
    query += ")";

    // Check for another filter option needing to applied to query (This is pattern n - 1)
    if (i < (validFilters.length - 1)) {
      query += " AND (";
    }
  }

  // This is for the case that the inner loop isn't applied (bad code practice for one off case)
  if (validFilters.length === 0) {
    query += ")";
  }

  query += " GROUP BY shortName;";
  return query;
}


/**
 * Primarly this function is meant to factor out code. The two purposes it serves is 1, updating the
 * state of the database with the client chosen course, 2 save a snapshot of the logged in user
 * code.
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {String} className - Name of the class to the user selected course to enroll within
 * @param {String} userName - The username of the logged in user.
 * @param {String[]} currentCourses - An array of courses that the user is currently taking
 * @param {Integer} id - An id representing the id of the course we are enrolling in
 * @returns {String} - Represents a randomized 6 digit string code to be sent to the user.
 */
async function helperFunction(db, className, userName, currentCourses, id) {
  try {
    // Updating the database available seat count now
    let updateSeatCount = "UPDATE classes SET availableSeats = availableSeats - 1" +
    " WHERE shortName = ? AND id = ?;";
    await db.run(updateSeatCount, [className, id]);

    // No need to store metadata into a variable (look later to remove it)

    // Insert the course schedule in backend now
    // First get major value from database
    let majorQuery = "SELECT major FROM userCourses WHERE username = ?;";
    let majorResult = await db.get(majorQuery, userName);
    let userMajor = majorResult.major;

    // Now updating the database to reflect all new courses on the backend
    let sql = "INSERT INTO userCourses (classId, username, takingCourse, major) VALUES (?, ?, ?, ?);";
    await db.run(sql, [id, userName, className, userMajor]);

    // creates the code
    let newCode = createCode();

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
    return newCode;
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Creates a random 6 digits code to distigush a new class enrollement for a student
 * @returns A string that is the code itself
 */
function createCode() {
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

  return newCode;
}

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
      let classInfoQuery = "SELECT date, availableSeats, subject, description FROM classes WHERE shortName = ?";

      // Execute the query to get class information
      let classInfoResult = await db.get(classInfoQuery, currentCourses[i].takingCourse);

      // Create a snapshot object for the current course and add it to studentClasses array
      let newCourseHistorySnapShot = { [currentCourses[i].takingCourse]: classInfoResult };
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
 * @param {String} toBeEnrolledCourseDate - The date that the request enrolled class lies on.
 * @param {String[]} currentCourses - An array of courses that the user is current taking
 * @return - A boolean representing if a conflict does indeed occur, true if so, if not false
 */
async function checkConflict(db, toBeEnrolledCourseDate, currentCourses) {
  let conflictInSchedule = false;
  try {
    for (let i = 0; i < currentCourses.length; i += 1) {
      let santizedInfo = await parsingOutDates(db, toBeEnrolledCourseDate, currentCourses[i]);

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
    let dateQuery = "SELECT date FROM classes WHERE shortName = ? AND id = ?;"
    let dateResultOB = await db.get(dateQuery, [currentCourse.takingCourse, currentCourse.classId]);
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

// Feature #6
app.get("/viewTransaction", async function(req, res) {
  /**
   * 1. Check if user is logged in
   *
   * 2. Grab (transaction history ) schedule history from database?
   */
});

/**
 * Checks if two time ranges overlap.
 * @param {string} range1 - The first time range in the format "x:xx-x:xx am/pm".
 * @param {string} range2 - The second time range in the format "x:xx-x:xx am/pm".
 * @returns {boolean} - True if the time ranges overlap, false otherwise.
 */
function timesOverlap(range1, range2) {
  // ex:
  // '13:30-15:30'
  // '9:30-10:30'
  let time1Arr = range1.split("-");
  let time2Arr = range2.split("-");

  let range1StartTime = time1Arr[0];
  let range1EndTime = time1Arr[1];

  let range2StartTime = time2Arr[0];
  let range2EndTime = time2Arr[1];

  // sort the star tand end times into a single array
  let allTimes = [
    [range1StartTime, range1EndTime],
    [range2StartTime, range2EndTime]
  ].sort((a, b) => {
    let [aStartHour, aStartMinute] = a[0].split(":").map(Number);
    let [bStartHour, bStartMinute] = b[0].split(":").map(Number);

    if (aStartHour === bStartHour) {
      // if the hours are equal compare the minutes
      return aStartMinute - bStartMinute;
    }
    return aStartHour - bStartHour;
  });

  // check if the end time of the irst range is greater than the
  // start time of the second range. If so we know there is a overlap.
  let isOverlap = allTimes[1][0] < allTimes[0][1];
  return isOverlap;
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
