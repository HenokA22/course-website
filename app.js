/**
 * Name: Jimmy Le & Henok Assalif
 * Date: June 4th, 2024
 * Section: CSE 154 AE Peter Oh & Kasten Welsh
 *
 * This the app.js files structures the API used for the myplan website. Certain requests can be
 * such as logging in a user and viewing course history.
 */

"use strict";

const express = require("express");
const app = express();
const multer = require("multer");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const fs = require('fs').promises;

const SUCCESS_CODE = 200;
const SERVER_ERROR_CODE = 500;
const USER_ERROR_CODE = 400;
const DEFAULT_PORT = 8000;
const RANGE = 6;
const MAX_ASCII = 126;
const MIN_ASCII = 33;
const MINUTES = 60;
let confirmationCodes = new Set();

/**
 * Going to be an object of users to JS objects that contain all the past course information
 * a users current courses
 *
 */

// for application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true}));

// for application/json
app.use(express.json());

// for multipart/form-data (required with FormData)
app.use(multer().none());

/**
 *
 * The date field in format of D D D  x:xx-x:xx period(am/pm)
 *
 * course history: Each key is a username is formated as an JS objects. The representation is as
 * follows.  that are in the form
 * username: {
 *   transactionCode: currentCourse (The value from the "currentCourses" attribute in the db);
 * }
 */

/** Retrives all the classes alongside their information from the database */
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

/** Retrives the most recent users schedules with course information */
app.get("/getSchedule/:userName", async function(req, res) {
  let userName = req.params.userName;
  let query = "SELECT scheduleCode FROM login WHERE username = ?;";
  try {
    // Qurerying the database for the schedule code
    let db = await getDBConnection();
    let result = await db.get(query, userName);
    let scheduleCodeR = result.scheduleCode;

    // Reading the course history file for the user most recent schedule
    let data = await fs.readFile("courseHistory.json", "utf8");
    let courseHistory = JSON.parse(data);
    let userPastSchedules = courseHistory[userName][scheduleCodeR];

    // adding the code to the user past schedules
    userPastSchedules.push(scheduleCodeR);

    // Sending back the user past schedule to the client
    res.json(userPastSchedules);

    // Closing the database connection
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
        let updateLoginStatus = "UPDATE login SET loginstatus = ? WHERE username = ? " +
                                "AND password = ?;";
        await db.run(updateLoginStatus, ["false", username, password]);

        await closeDbConnection(db);

        res.type("text").status(SUCCESS_CODE)
          .send("Signout successful");
      } else {
        res.type("text").status(USER_ERROR_CODE)
          .send("Signout failed.");
      }
    } catch (error) {
      handleError(res, error);
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
      handleError(res, error);
    }
  } else {
    // Case such that user didn't add there username or password.
    res.type("text").status(USER_ERROR_CODE)
      .send("Username or Password is empty, please try again");
  }
});

// Provides more information on a specified course
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
      await closeDbConnection(db);
      if (result.length !== 0) {
        res.json(result);
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
  if (userName) {
    // Checking the login status
    let query = "SELECT loginStatus FROM login WHERE username = ?;";

    // have a way to denote whether or not the user is signed in.
    try {
      let db = await getDBConnection();
      let result = await db.get(query, userName);

      // Extracting the text (true / false)
      let isUserLogin = result.loginStatus;
      await checkLoginStatus(isUserLogin, className, classId, userName, db, res);

      await closeDbConnection(db);// (debug this later)
    } catch (error) {
      console.error("Error:1", error);
    }
  } else {
    res.type("text").status(USER_ERROR_CODE)
      .send("No username is specified. Please login in before trying to adding a class");
  }
});

/** Removes a specified course from history  */
app.post("/removeCourse", async function(req, res) {
  let userName = req.body.userName;
  let className = req.body.className;
  if (userName) {
    let query = "DELETE FROM userCourses WHERE username = ? AND takingCourse = ?;";
    try {
      // Drop the course fromt the database
      let db = await getDBConnection();
      await db.run(query, [userName, className]);

      // Update the available seats in the classes table
      let updateSeats = "UPDATE classes SET availableSeats = availableSeats + 1" +
                          " WHERE shortName = ?";
      await db.run(updateSeats, className);

      // Getting current courses from database
      let currentCourses = await getCurrentCourses(db, userName, res);

      // Update the course history
      await updateCourseHistory(db, userName, currentCourses); // double check this later
      await closeDbConnection(db);

      res.type("text").status(SUCCESS_CODE)
        .send("Removing course successful");

    } catch (error) {
      console.error("Error:2", error);
    }
  } else {
    res.type("text").status(USER_ERROR_CODE)
      .send("No username is specified. Please login in before trying to adding a class");
  }
});

/**
 * Function that checks the login status of the user given the params
 * @param {Boolean} isUserLogin - Boolean representing if the user is logged in or not
 * @param {String} className - name of the short name class
 * @param {Integer} classId - id of the short name class
 * @param {String} userName - name of the user
 * @param {Object} db - SQLite database connection
 * @param {Object} res - response object used to send back to the client
 */
async function checkLoginStatus(isUserLogin, className, classId, userName, db, res) {
  if (isUserLogin === "true") {
    let arr = await helpBreakDownLogin(db, className, classId, res);
    let totalSeatsVal = arr[0];
    let toBeEnrolledCourseDate = arr[1];
    if (totalSeatsVal > 0) {
      let currentCourses = await getCurrentCourses(db, userName, res);
      if (!currentCourses) {
        return;
      }
      let conflictInScheduleResult = await checkConflict(
        db,
        toBeEnrolledCourseDate,
        currentCourses
      );
      if (!conflictInScheduleResult) {
        await checkConflictHelper(db, currentCourses, className, userName, classId, res);
      } else {
        res.type("text").status(USER_ERROR_CODE)
          .send("A conflict in your schedule has occured");
      }
    } else {
      res.type("text").status(USER_ERROR_CODE)
        .send("This course is at capacity. Cannot enroll");
    }
  } else {
    res.type("text").status(USER_ERROR_CODE)
      .send("You are not logged in. Please sign in");
  }
}

/**
 * helpBreakDownLogin is soley used to reduce linters
 * @param {Object} db - SQLite database connection
 * @param {String} className - name of the short name class
 * @param {Integer} classId - id of the short name class
 * @param {Object} res - response object used to send back to the client
 * @returns {Object} - array representing totalSeatsVal & toBeEnrolledCourseDate
 */
async function helpBreakDownLogin(db, className, classId, res) {
  let classInfo = await getClassInfo(db, className, classId, res);
  if (!classInfo) {
    return;
  }
  let totalSeatsVal = classInfo.availableSeats;
  let toBeEnrolledCourseDate = classInfo.date;
  return [totalSeatsVal, toBeEnrolledCourseDate];
}

/**
 * Function that retrieves class information from the database and sends
 * appropriate response if not found
 * @param {Object} db - SQLite database connection
 * @param {String} className - name of the short name class
 * @param {Integer} classId - id of the short name class
 * @param {Object} res - response object used to send back to the client
 * @returns {Object} - Class information if found, null otherwise
 */
async function getClassInfo(db, className, classId, res) {
  let query = "SELECT * FROM classes WHERE shortName = ? AND id = ?;";
  let classInfo = await db.get(query, [className, classId]);
  if (!classInfo) {
    res.type("text").status(USER_ERROR_CODE)
      .send("This class does not exist");
    return null;
  }
  return classInfo;
}

/**
 * Function that retrieves current courses of the user from the database
 * and sends appropriate response if not found
 * @param {Object} db - SQLite database connection
 * @param {String} userName - name of the user
 * @param {Object} res - response object used to send back to the client
 * @returns {Object[]} - Array of current courses if found, null otherwise
 */
async function getCurrentCourses(db, userName, res) {
  let query = "SELECT takingCourse, classId FROM userCourses WHERE username = ?;";
  let currentCourses = await db.all(query, userName);
  if (!currentCourses) {
    res.type("text").status(USER_ERROR_CODE)
      .send("Error retrieving user courses");
    return null;
  }
  return currentCourses;
}

/**
 * Function that is used to help check the conflict of two date times user passed.
 * @param {Object} db - The SQLite database connection.
 * @param {Object[]} currentCourses - An array of courses that the user is currently taking
 * @param {String} className - The name of the class short name the user wants to enroll in
 * @param {String} userName - The username of the logged in user
 * @param {Integer} classId - The id of the class the user wants to enroll in
 * @param {Object} res - response object used to send back to the client
 */
async function checkConflictHelper(db, currentCourses, className, userName, classId, res) {
  let addingAnNewClass = isNewClass(currentCourses, className);

  if (addingAnNewClass) {
    let newCode = await helperFunction(db, className, userName, currentCourses, classId);

    res.type("text").status(SUCCESS_CODE)
      .send("Successfully added course, this is the confirmation code: " + newCode);
  } else {
    res.type("text").status(USER_ERROR_CODE)
      .send("Cannot enroll in a class you have already enrolled.");
  }
}

/**
 * Function that checks if the class to be added is new
 * @param {Object[]} currentCourses - An array of courses that the user is currently taking
 * @param {String} className - The name of the class short name the user wants to enroll in
 * @returns {Boolean} - True if the class is new, false otherwise
 */
function isNewClass(currentCourses, className) {
  for (let i = 0; i < currentCourses.length; i += 1) {
    if (currentCourses[i].takingCourse === className) {
      return false;
    }
  }
  return true;
}

/**
 * Performs a search on the data base for classes that match the search term and filters.
 * ?className=x,date=x,subject=x,credits=x,courseLevel=x (Format of query parameters)
 */
app.get("/search", async function(req, res) {
  let className = req.query.className;
  let date = req.query.date; // Checkbox on the front end: M W F in an array as a string ["M", "W"]
  let subject = req.query.subject; // an array of subjects as an string (e.g ["Computer Science"])
  let credits = req.query.credits; // an array of credits as a string (e.g [5])
  let courseLevel = req.query.courseLevel; // An array course level on the front end as a string
  let query = "";
  let classQueryUsed = false;

  // All possible filters ()
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

  await constructSearchQueryHelper(className, classQueryUsed, query, validFilters, res);
});

/**
 * Used to help construct the search endpoint. It returns whether or not we have a matching query.
 * @param {String} className - The name of the class short name the user wants to enroll in
 * @param {Boolean} classQueryUsed - Boolean representing if the classQuery was used
 * @param {String} query - empty query used to store the resultant query from createQuery
 * @param {Object} validFilters - array of possible valid filters we have
 * @param {Object} res - response object used to send back to the client
 */
async function constructSearchQueryHelper(className, classQueryUsed, query, validFilters, res) {
  // Valid Filters after completions should be ["date", "M", "F"] for example
  let result = await createQuery(className, classQueryUsed, query, validFilters);
  query = result[0];
  classQueryUsed = result[1];
  try {
    let db = await getDBConnection();

    /**
     * Ternary operator is used to distingush whether or not the a search term was used in the
     * search bar.
     */
    let result2 = classQueryUsed ? await db.all(query, `%${className}%`) : await db.all(query);

    // Empty array (query) represents no matching classes
    if (result2.length === 0) {
      throw new Error("No matching results");
    }
    let matchingSearchClasses = {"classes": result2};
    await closeDbConnection(db);
    res.json(matchingSearchClasses);
  } catch (error) {
    if (error.message === "No matching results") {
      res.type("text").status(USER_ERROR_CODE)
        .send("This search combination yielded not results");
    } else {
      res.type("text").status(SERVER_ERROR_CODE)
        .send("An error occurred on the server. Try again later.");
    }
  }
}

/** Sends back information of entire history of saved user schedules */
app.get("/previousTransactions", async function(req, res) {
  // Check if username and password are in the database
  let username = req.query.username;

  // Checking the login status
  let query = "SELECT loginStatus FROM login WHERE username = ?;";

  // have a way to denote whether or not the user is signed in.
  try {
    await sendTransactionHelper(username, query, res);
  } catch (error) {
    // an error occured with one of the queries here
    handleError(error);
  }
});

/**
 * Helper method that sends the courseHistory back to the client.
 * @param {String} username - username of the user
 * @param {String} query - String representing the query
 * @param {Object} res - response object used to send back to the client
 */
async function sendTransactionHelper(username, query, res) {
  if (username) {
    let db = await getDBConnection();
    let result = await db.get(query, username);
    await closeDbConnection(db);

    // Extracting the text (true / false)
    let isUserLogin = result.loginStatus;

    // Get all schedules of courses for this user
    let data = await fs.readFile("courseHistory.json", "utf8");
    let courseHistory = JSON.parse(data);
    if (isUserLogin === "true") {
      /**
       * Send back all the course history for this user as a JSON object
       */
      if (Object.keys(courseHistory).length === 0) {
        await fs.writeFile("courseHistory.json", JSON.stringify(courseHistory));
        res.type("text").status(USER_ERROR_CODE)
          .send("No course history for this user");
      } else {
        let userPastSchedules = courseHistory[username];
        await fs.writeFile("courseHistory.json", JSON.stringify(courseHistory));

        // Sending back all users past -- "transactions" -- course information
        res.json(userPastSchedules);
      }
    } else {
      await fs.writeFile("courseHistory.json", JSON.stringify(courseHistory));
      res.type("text").status(USER_ERROR_CODE)
        .send("You are not logged in. Please sign in");
    }
  }
}

/**
 * Creates an full query depending on the search / filter conditions specified
 * @param {String} className - The search term used in the search bar
 * @param {Boolean} classQueryUsed - A boolean flag representing whether the search bar contains
 *                                    a value
 * @param {String} query - An string representing a empty query
 * @param {Object} validFilters - A 2D array containing information about which filters to apply
 * @returns {Object} - A array containing a newly assembled Query along with
 *                     whether or not a term is used in the search term. The latter is represented
 *                     by a boolean.
 */
async function createQuery(className, classQueryUsed, query, validFilters) {
  let searchBarNotEmpty = classQueryUsed;
  let isPartial = await determinePartialSearch(className);

  if (isPartial && className !== undefined) {
    searchBarNotEmpty = true;

    // Always use shortName
    query += "SELECT * FROM classes WHERE (shortName LIKE ?";
    query = applyFiltersToQuery(query, validFilters);
  } else if (className) {
    searchBarNotEmpty = true;

    // Regular expression used to match any digit
    const regex = /\d/;

    query = helperCreateQuery(regex, query, className, validFilters);
  } else {

    // reconstruct query based off data
    query = "SELECT * FROM classes WHERE (";
    query = applyFiltersToQuery(query, validFilters);
  }
  return [query, searchBarNotEmpty];
}

/**
 * Helper method used to break down createQuery
 * @param {String} regex - regular expressed used to match any digit
 * @param {String} query - current query used in createQuery
 * @param {String} className - name of the class
 * @param {Object} validFilters - A 2D array containing information about which filters to apply
 * @returns {String} - returning back the string query after modification
 */
function helperCreateQuery(regex, query, className, validFilters) {
  // Test to see if search term is a short name or full name of a class
  if (regex.test(className)) {
    // Search used shortname
    query += "SELECT * FROM classes WHERE (shortName LIKE ?";
    query = applyFiltersToQuery(query, validFilters);
  } else {
    query += "SELECT * FROM classes WHERE (name LIKE ?";

    // Regular class name used in search
    query = applyFiltersToQuery(query, validFilters);
  }
  return query;
}

/**
 * Determines whether or not a search input is incomplete
 * @param {String} className - The search term used in the search bar
 * @returns {Boolean} - A boolean that returns false if search input contains a
 *                      complete short name or regular name. Vice versa true if
 *                      the input is incomplete
 */
async function determinePartialSearch(className) {
  let db = await getDBConnection();
  let fullNameQuery = "SELECT name FROM classes WHERE name = ? GROUP BY name";
  let shortNameQuery = "SELECT shortName FROM classes WHERE shortName = ? GROUP BY shortName";
  let returnBool;
  try {
    let fullNameResult = await db.get(fullNameQuery, className);
    let shortNameResult = await db.get(shortNameQuery, className);

    // If both are not queries not success then
    if (fullNameResult === undefined && shortNameResult === undefined) {
      returnBool = true;
    } else {
      returnBool = false;
    }
  } catch (error) {
    handleError(error);
  }
  await closeDbConnection(db);
  return returnBool;
}

/**
 * Applies filters to a translated search query from the UI
 * @param {String} query - A select statement without filters
 * @param {Array} validFilters - An array of all the filters to apply on the query
 * @returns {String} - Completed search query with filters applied
 */
function applyFiltersToQuery(query, validFilters) {
  // This double for loop generates the search/filter query
  for (let i = 0; i < validFilters.length; i += 1) {
    let nameAndValuesForAFilter = validFilters[i];
    let name = nameAndValuesForAFilter[0];

    /**
     * Fenceposting issue with first filter appendement if query contains a classname (bad code
     * quality -- in a time crunch)
     */
    if ((i === 0) && (query.charAt(query.length - 1) === '?')) {
      query += ") AND (";
    }

    query = applyConditionFilterHelper(nameAndValuesForAFilter, name, query);

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

  query += "GROUP BY shortname;";
  return query;
}

/**
 * Helper function used to further construct the query but broken down into this method
 * for code quality.
 * @param {Object} nameAndValuesForAFilter - array  of all the filters being applied
 * @param {String} name - name of the class
 * @param {String} query - overall query we are constructing based on filters
 * @returns {String} - query representing what we are adding
 */
function applyConditionFilterHelper(nameAndValuesForAFilter, name, query) {
  // traversing the values of a filter
  for (let j = 1; j < nameAndValuesForAFilter.length; j += 1) {

    // The query structure differs based on if the date filter is applied.
    if (name === "date") {
      query += name + " LIKE \"%" + nameAndValuesForAFilter[j] + "%\"";
    } else if (name === "subject") {
      query += name + " = \"" + nameAndValuesForAFilter[j] + "\"";
    } else {
      query += name + " = " + nameAndValuesForAFilter[j];
    }

    // Checking whether or not another filter options is needed
    if (j !== (nameAndValuesForAFilter.length - 1)) {
      query += " OR ";
    }
  }
  return query;
}

/**
 * Primarly this function is meant to factor out code. The two purposes it serves is 1, updating the
 * state of the database with the client chosen course, 2 save a snapshot of the logged in user
 * schedule.
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

    // Now updating the database to reflect all new courses on the backend
    let sql = "INSERT INTO userCourses (classId, username, takingCourse) VALUES (?, ?, ?);";
    await db.run(sql, [id, userName, className]);

    let newCode = await updateCourseHistory(db, userName, currentCourses);
    return newCode;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Updates the course history of the user with the new course and enrollment confirmation.
 * @param {sqlite3.Database} db - The SQLite database connection.
 * @param {String} userName - The username of the logged in user.
 * @param {Object[]} currentCourses - An array of courses that the user is currently taking
 * @returns {String} - A string representing the confirmation of enrollment
 */
async function updateCourseHistory(db, userName, currentCourses) {
  try {
    // Check if the database connection is open
    if (!db || !db.open) {
      throw new Error("Database connection is not open");
    }

    let newCode = createCode();

    // Adding the new code as the link to the most recent schedule to the database
    let newQuery = "UPDATE login SET scheduleCode = ? WHERE username = ?;";
    await db.run(newQuery, [newCode, userName]);

    // Gather all the information for each course and update currentCourses
    let newClassRes = "SELECT takingCourse, classId FROM userCourses WHERE username = ?;";
    currentCourses = await db.all(newClassRes, userName);

    /*
     * Grabbing information from each course the student is taking
     * and assembling that into a larger array representing the current schedule
     */
    let studentClasses = await getStudentClassesInfo(db, currentCourses);

    helperConstructCourseHistory(newCode, studentClasses, userName);

    return newCode;
  } catch (error) {
    console.error("Error in updateCourseHistory:", error);
  }
}

/**
 * Helper function used in helperFunction to add the newly course and enrollment confirmation
 * to the courseHistory of the person.
 * @param {String} newCode - String representing the confirmation of enrollment
 * @param {Object} studentClasses - array representing the curring classes user is enrolled in
 * @param {String} userName - name of the user who is logged in.
 */
async function helperConstructCourseHistory(newCode, studentClasses, userName) {
  /**
   * adding new "transaction(adding a class) to be mapped to a user up to date
   * course schedule.
   */
  let newTransactionKey = newCode;
  let data = await fs.readFile("courseHistory.json", "utf8");
  let courseHistory = JSON.parse(data);

  // Adding user new current schedule to course history
  let keys = Object.keys(courseHistory);
  let isNew = true;
  for (let i = 0; i < keys.length; i++) {
    let currUsername = keys[i];
    if (currUsername === userName) {
      isNew = false;
      let currTransactionObj = courseHistory[currUsername];

      // inserting a new transactionKey for the new student class
      currTransactionObj[newTransactionKey] = studentClasses;
    }
  }
  if (isNew) {
    courseHistory[userName] = {};
    courseHistory[userName][newTransactionKey] = studentClasses;
  }
  await fs.writeFile("courseHistory.json", JSON.stringify(courseHistory));
}

/**
 * Creates a random 6 digits code to distigush a new class enrollement for a student
 * @returns {String} - A string that is the code itself
 */
function createCode() {
  // Creating the confirmation code below
  let newCode = "";
  let invalidCode = true;

  // While loop checks if the code is invalid or not
  while (invalidCode) {
    newCode = "";
    for (let i = 0; i < RANGE; i += 1) {
      // Picking a random ascii value from dec 33 to 126
      let randomNumInRange = Math.floor(Math.random() * (MAX_ASCII - MIN_ASCII + 1) + MIN_ASCII);
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
      let classInfoQuery = "SELECT date, availableSeats, subject, " +
                          "description, credits FROM classes WHERE shortName = ? AND id = ?;";

      // Execute the query to get class information
      let classInfoResult = await db.get(
        classInfoQuery,
        [currentCourses[i].takingCourse, currentCourses[i].classId]
      );

      // Create a snapshot object for the current course and add it to studentClasses array
      let newCourseHistorySnapShot = {[currentCourses[i].takingCourse]: classInfoResult};
      studentClasses.push(newCourseHistorySnapShot);
    }

    return studentClasses;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Checks if there is a time conflict between two classes
 * @param {sqlite3.Database} db - The database object for the connection
 * @param {String} toBeEnrolledCourseDate - The date that the request enrolled class lies on.
 * @param {String[]} currentCourses - An array of courses that the user is current taking
 * @returns {Boolean} - A boolean representing if a conflict does indeed occur,
 *                      true if so, if not false
 */
async function checkConflict(db, toBeEnrolledCourseDate, currentCourses) {

  let conflictInSchedule = false;
  try {
    for (let i = 0; i < currentCourses.length; i += 1) {
      let santizedInfo = await parsingOutDates(db, toBeEnrolledCourseDate, currentCourses[i]);

      /**
       * Check each day the to be enrolled course takes places against logged in user current
       * course days
       */
      for (let j = 0; j < santizedInfo[2].length; j += 1) {

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
    handleError(error);
  }
}

/**
 * Retrives the dates and times of both a current class a student is taking and the enrolled one
 * the student plans on taking.
 * @param {sqlite3.Database} db - The database object for the connection
 * @param {String} toBeEnrolledCourseDate - The dates that the request enrolled date
 *                                      lies on.
 * @param {String} currentCourse - A course that the logged in user is taking
 * @returns {Object} - An array of santatized day and time information for
 *                     both class the user is taking and request classes
 */
async function parsingOutDates(db, toBeEnrolledCourseDate, currentCourse) {
  try {

    // Accessing the nested date value from result of .get()
    let dateQuery = "SELECT date FROM classes WHERE shortName = ? AND id = ?;";
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
    let selectedCourseDaysSplit = selectedCourseDays.split(" ");
    let currentCourseDaysSplit = currentCourseDays.split(" ");

    let returnArr = [];
    returnArr.push(selectedCourseTimes);
    returnArr.push(currentCourseTimes);
    returnArr.push(selectedCourseDaysSplit);
    returnArr.push(currentCourseDaysSplit);
    return returnArr;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Checks if two time ranges overlap.
 * @param {string} range1 - The first time range in the format "HH:mm-HH:mm".
 * @param {string} range2 - The second time range in the format "HH:mm-HH:mm".
 * @returns {boolean} - True if the time ranges overlap, false otherwise.
 */
function timesOverlap(range1, range2) {
  // Split the time ranges into start and end times
  let time1Arr = range1.split("-");
  let time2Arr = range2.split("-");

  let range1StartTime = convertToMinutes(time1Arr[0]);
  let range1EndTime = convertToMinutes(time1Arr[1]);

  let range2StartTime = convertToMinutes(time2Arr[0]);
  let range2EndTime = convertToMinutes(time2Arr[1]);

  // Check if the time ranges overlap
  return (range1StartTime < range2EndTime) && (range2StartTime < range1EndTime);
}

/**
 * Converts a time in "HH:mm" format to minutes since midnight.
 * @param {string} time - The time string to convert.
 * @returns {number} - The number of minutes since midnight.
 */
function convertToMinutes(time) {
  let [hours, minutes] = time.split(':').map(Number);
  return hours * MINUTES + minutes;
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

/**
 * Handles errors in a try-catch block and sends an error response to the client.
 * @param {Error} error - The error object.
 */
function handleError(error) {
  console.error("Internal server error: " + error);
}

// tells the code to serve static files in a directory called 'public'
app.use(express.static('public'));
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);

/**
 * To - dos:
 *
 * 1.) In order to store changes that occur after a website has been closed, we need to change
 * the courseHistory object to a database. This will allow us to store the changes that occur after
 * the website has been closed.(Done)
 *
 * 2.) Debug the class enrollment feature. (As we go)
 *
 * 3.) Think about how to access the most recent users schedule. (Done)
 *
 * 4.) Design and research how to make visual schedule for the user. (figure out if creating the
 *    scheudle or resuing other code is what we need to do.)
 *    4a.) Create the button to view the visual schedule (Done)
 *
 *    4b.) Create the pop up window to display the visual schedule (Get inspo from view enrolled
 *          schedules page) (Done)
 *    4c.) Create the visual schedule for the user (Done)
 *
 *    4d.) Space the items out (DONE) and brainstorm how to call the most recent schedule
 *         information and populate the schedule. Consult the image in ipad about class (HTML li)
 *         structure.
 *         (Done)
 *
 *          (TODO) Test out the loading of new classes (Try to enroll in a new class live)
 *          (TODO) Add removal of li items from days ul when loading schedule population (DONE)
 *    4e.) Make the visual schedule look pretty (TODO)
 *
 *    4f.) Remove list dot styling (TODO)
 *
 * 5.) Add a endpoint to remove a course from the users schedule. (Done)
 *
 * 6.) Create a delete button on each of the courses in the view enrolled courses page. (Done Basic)
 *     (TODO: how to remove course without making the transactions page go away.)
 *     (TODO: How to remove the course from the visual schedule but make li disapear live instead
 *            of having to close modal and reopen it.)
 *
 *
 * 7.) Bug: When adding courses with a mulitiple times, the first course with the earliest time is
 *        added to the schedule. (TODO: Fix this bug)
 */
