"use strict";
(function() {
  window.addEventListener("load", init);
  let globalPassword = "";

  /** Function that runs when the page is loaded and sets up other functions. */
  function init() {
    checkLogin();
    id("login").addEventListener("click", login);
    id("course-input").addEventListener("input", search);
    id("signout").addEventListener("click", signout);
    load();
  }

  function checkLogin() {
    let key = localStorage.key(0);
    if(key) {
      id("display-login").classList.add("hidden");
      id("login").classList.add("hidden");
      id("signout").classList.remove("hidden");
      id("displayUser").textContent = "Welcome, " + key;
      id("displayUser").classList.remove("hidden");
    }
  }

  /**
   * Function that loads the courses from the server and displays them on the page.
   */
  async function load() {
    try {
      let response = await fetch("/getItems");
      await statusCheck(response);
      let data = await response.json();
      let classList = id("classes");

      for (let i = 0; i < data.classes.length; i++) {
        let currObj = data.classes[i];
        let currCourseDOM = constructCourse(currObj);
        classList.appendChild(currCourseDOM);
      }
    } catch (err) {
      console.log(err);
      fetchErr();
    }
  }

  /**
   * Function that constructs the course object and returns it as a DOM object.
   * @param {Object} course - object that contains information about a course as JSON
   * @returns {Object} - DOM object that contains the course information
   */
  function constructCourse(course) {
    let courseContainer = document.createElement("article");

    let courseName = document.createElement("h2");
    courseName.textContent = course.shortName;

    let courseTitle = document.createElement("p");
    courseTitle.textContent = course.name;

    let courseLevel = document.createElement("p");
    courseLevel.textContent = "Course Level: " + course.courseLevel;

    let courseCredits = document.createElement("p");
    courseCredits.textContent = "Course Credits: " + course.credits;

    courseContainer.appendChild(courseName);
    courseContainer.appendChild(courseTitle);
    courseContainer.appendChild(courseLevel);
    courseContainer.appendChild(courseCredits);

    return courseContainer;
  }

  function toggleActiveLogin() {
    id("pop-up-login").classList.toggle("active");
    id("overlay").classList.toggle("active");
    id("error-message").textContent = '';
    id("username").value = '';
    id("password").value = '';
  }

  function login() {
    toggleActiveLogin();
    qs(".close-button").addEventListener("click", toggleActiveLogin);
    qs(".login-official").addEventListener("click", loginOfficial);
  }

  async function signout() {
    try{
      let username = id("displayUser").textContent.split(",")[1].trim();
      if (localStorage.length > 0) {
        globalPassword = localStorage.getItem(username);
      }
      let password = globalPassword;
      let params = new FormData();

      console.log(password);
      params.append("username", username);
      params.append("password", password);

      let response = await fetch("/signout", {method: "POST", body: params});

      await statusCheck(response);
      if (response.status === 200) {
        localStorage.removeItem(username);
        id("login").classList.remove("hidden");
        id("display-login").classList.remove("hidden");
        id("signout").classList.add("hidden");
        id("displayUser").classList.add("hidden");
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function loginOfficial() {
    let username = id("username").value.trim();
    let password = id("password").value.trim();
    let savePass = id("saveName");
    if (username !== '' && password !== '') {
      try {
        let params = new FormData();
        params.append("username", username);
        params.append("password", password);
        let saveUser = false;
        if(savePass.checked) {
          params.append("savePassWord", true);
          saveUser = true;
        }
        let result = await fetch("/login", {method: "POST", body: params});
        if(result.status === 400) {
          // bad request from user.
          id("error-message").textContent = "Invalid username or password";
          id("error-message").classList.add("error");
        } else {
          await statusCheck(result);
          if (result.status === 200) {
            toggleActiveLogin();
            id("login").classList.add("hidden");
            id("display-login").classList.add("hidden");
            id("signout").classList.remove("hidden");
            id("displayUser").textContent = "Welcome, " + username;
            id("displayUser").classList.remove("hidden");
            if(saveUser) {
              window.localStorage.setItem(username, password);
            }
            globalPassword = password;
          } else {
            id("error-message").textContent = data.message;
          }
        }
      } catch (err) {
        handleLoginErr(err);
      }
    } else {
      let msg = id("error-message");
      msg.classList.add("error");
      msg.textContent = "Please fill in all the fields";
    }
  }
  /**
   * Function that runs when the search button is clicked.
   * It logs a message to the console.
   */
  function search() {
    let searchTerm = id("course-input").value.trim();
    let btn = id("search-button");
    if (searchTerm === "") {
      btn.classList.add("hidden");
    } else {
      btn.classList.remove("hidden");
    }
  }

  function handleSignoutErr(err) {
    let frame = qs("body");
    frame.innerHTML = ' ';
    let error = document.createElement("p");
    error.textContent = "Unable to sign out user due to error: " + err;
    frame.appendChild(error);
  }

  function handleLoginErr(err) {
    let frame = qs("body");
    frame.innerHTML = ' ';
    let error = document.createElement("p");
    error.textContent = "Unable to log in user due to error: " + err;
    frame.appendChild(error);
  }

  /**
   * Checks the status of the response and throws an error if the status
   * is not ok.
   * @param {Response} res - result from the fetch request
   * @returns {Response} - the result from the fetch request
   */
  function statusCheck(res) {
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    return res;
  }

  /**
   * Universal error that signifies that there was a error during or after a fetch
   */
  function fetchErr() {
    console.error("There was an error with the fetch request");
  }
  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} id - element ID
   * @return {object} DOM object associated with id.
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} query - CSS query selector.
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qs(query) {
    return document.querySelector(query);
  }
})();