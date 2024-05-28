"use strict";

const express = require('express');
const app = express();
const multer = require("multer");
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
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

// Feature #3
app.get("/getItem/:itemName", async function(req, res) {
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
app.get("/checkCourse", async function(req, res) {
  try {

  } catch (error) {

  }
});

// Feature #2
app.get("/login", async function(req, res) {
  try {

  } catch (error) {

  }
})



// tells the code to serve static files in a directory called 'public'
app.use(express.static('public'));

/*
 * Allows us to change the port easily by setting an environment
 * variable, so your app works with our grading software
 */
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);
