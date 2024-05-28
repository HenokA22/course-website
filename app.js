"use strict";

const express = require("express");
const app = express();
const multer = require("multer");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const cookieParser = require("cookie-parser");
// how to use cookie parser: https://github.com/expressjs/cookie-parser
const SUCCESS_CODE = 200;
const SEVERE_ERROR_CODE = 500;
const USER_ERROR_CODE = 400;
const DEFAULT_PORT = 8000;

// for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module


// Feature #1
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
    res.type("text").status(STATUS_CODE_500)
      .send("An error occurred on the server. Try again later.");
  }
});

// Feature #2
app.post("/login", async function(req, res) {
  // Check if username and passaword are in database
  let username = req.body.username;
  let password = req.body.password;

  if(username && password) {
    let query = "SELECT username, password, loginStatus FROM users WHERE username = ? AND password = ?";
    try {
      let db = await getDBConnection();
      let result = await db.get(query, [username, password]);
      if(result !== undefined) {
        // here we know the login was sucessful
        // we can now update the login status
        let updateQuery = "UPDATE users SET loginStatus = ? WHERE username = ? AND password = ?";
        await db.run(updateQuery, [true, username, password]);
        res.status(SUCCESS_CODE).send("Login successful");
      } else {
        res.status(USER_ERROR_CODE).send("Login failed. Invalid user.");
      }
    } catch (error) {
      console.log(errror);
    }
  }
});

// Feature #3
app.get("/itemDetails/:itemName", async function(req, res) {
  /**
   * Get further information about an item, should be in the form of a JSON object
   */
  try {
    let data = await fstat.readFile("data/items.json", "utf-8");
    data = JSON.parse(data);
    let itemData = data[req.params.itemName];
    res.type("json").send(itemData);
  } catch (error) {
    res.type("text");
    if (err.code === "ENOENT") {
      res.status(SEVERE_ERROR_CODE).send("file does not exist");
    } else {
      res.status(SEVERE_ERROR_CODE).send("something went wrong on the server. Please try again.");
    }
  }
});

// Feature #4
app.post("/checkCourse", async function(req, res) {
  /**
   * 1. Figure out if user is logged in
   *
   * 2. If so , check the clients request to add a class is successful (This is distingushed by
   *    whether or not the class is at maximum capcity
   *
   * 3. An unique 6 digit combo is created if successful is reached
   *
   * 4. update the server with course enrollment
   *
   * 5. send back the code
   */
  try {

  } catch (error) {

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
