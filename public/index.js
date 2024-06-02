"use strict";
(function() {
  window.addEventListener("load", init);

  /** Function that runs when the page is loaded and sets up other functions. */
  function init() {
    checkLogin();
    id("login").addEventListener("click", login);
    id("course-input").addEventListener("input", search);
    id("signout").addEventListener("click", signout);
    load();
  }

  /**
   * Function is used on reload to check if the user is logged in. If so,
   * it will display the user's name and hide the login button as if the user
   * is already logged in.
   */
  function checkLogin() {
    let key = localStorage.key(0);
    if(key) {
      if(JSON.parse(localStorage.getItem(key))[1]) {
        id("display-login").classList.add("hidden");
        id("login").classList.add("hidden");
        id("signout").classList.remove("hidden");
        id("displayUser").textContent = "Welcome, " + key;
        id("displayUser").classList.remove("hidden");
      } else {
        signout();
      }
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
        currCourseDOM.addEventListener('click', openCourse);
        classList.appendChild(currCourseDOM);
      }
    } catch (err) {
      fetchErr();
    }
  }

  function toggleCoursePage() {
    qsa('.title')[1].textContent = '';
    qs('.body-course').textContent = '';
    id("error-message").textContent = '';
    id("pop-up-courses").classList.toggle("active");
    id("overlay2").classList.toggle("active");
  }

  function openCourse() {
    toggleCoursePage();
    qsa(".close-button")[1].addEventListener("click", toggleCoursePage);
    let title = document.createTextNode(this.querySelector("h2").textContent + " - " +
                this.querySelector("p").textContent);
    qsa('.title')[1].appendChild(title);
    fetchCoursePage();
  }

  async function fetchCoursePage() {
    try{
      let courseName = qsa('.title')[1].textContent.split(' - ')[0].trim();
      console.log(courseName);
      let response = await fetch("/itemDetails/" + courseName);
      await statusCheck(response);
      let data = await response.json();

      let h3OverviewTitle = document.createElement("h3");
      h3OverviewTitle.textContent = "Course Overview";
      h3OverviewTitle.classList.add("title-overview");

      let coursePageOverviewDOM = constructCoursePageOverview(data);
      let courseSections = constructCourseSection(data);

      qs('.body-course').appendChild(h3OverviewTitle);
      qs('.body-course').appendChild(coursePageOverviewDOM);
      console.log(data);
    } catch (err) {
      console.log(err);
    }
  }

  function constructCourseSection(data) {

  }

  function constructCoursePageOverview(data) {

    let overviewContent = document.createElement("section");
    overviewContent.classList.add("overview-content");

    // container for course description
    let containerDesc = document.createElement("section");
    containerDesc.classList.add("containers");

    let courseDescTitle = document.createElement("p");
    courseDescTitle.textContent = "Course Description: ";
    courseDescTitle.classList.add("bold");

    let courseDesc = document.createElement("p");
    courseDesc.textContent = data.description;
    courseDesc.classList.add("course-desc");

    containerDesc.appendChild(courseDescTitle);
    containerDesc.appendChild(courseDesc);

    // container for course credits
    let containerCreds = document.createElement("section");
    containerCreds.classList.add("containers");

    let courseCreditsTitle = document.createElement("p");
    courseCreditsTitle.textContent = "Course Credits: ";
    courseCreditsTitle.classList.add("bold");

    let courseCredits = document.createElement("p");
    courseCredits.textContent = data.credits;
    courseCredits.classList.add("course-desc");

    containerCreds.appendChild(courseCreditsTitle);
    containerCreds.appendChild(courseCredits);

    // container for course level
    let containerLevel = document.createElement("section");
    containerLevel.classList.add("containers");

    let courseLevelTitle = document.createElement("p");
    courseLevelTitle.textContent = "Course Level:";
    courseLevelTitle.classList.add("bold");

    let courseLevel = document.createElement("p");
    courseLevel.textContent = data.courseLevel;
    courseLevel.classList.add("course-desc");

    containerLevel.appendChild(courseLevelTitle);
    containerLevel.appendChild(courseLevel);

    // container for course gpa
    let containerGPA = document.createElement("section");
    containerGPA.classList.add("containers");

    let averageGPATitle = document.createElement("p");
    averageGPATitle.textContent = "Average GPA: ";
    averageGPATitle.classList.add("bold");

    let averageGPA = document.createElement("p");
    averageGPA.textContent = data.avgGPA;
    averageGPA.classList.add("course-desc");

    containerGPA.appendChild(averageGPATitle);
    containerGPA.appendChild(averageGPA);

    // connecting all DOMS together.
    overviewContent.appendChild(containerDesc);
    overviewContent.appendChild(containerCreds);
    overviewContent.appendChild(containerLevel);
    overviewContent.appendChild(containerGPA);

    return overviewContent;
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

  /**
   * Function that toggles the active class of the login pop-up and overlay.
   */
  function toggleActiveLogin() {
    id("pop-up-login").classList.toggle("active");
    id("overlay").classList.toggle("active");
    id("error-message").textContent = '';
    id("username").value = '';
    id("password").value = '';
  }

  /**
   * Function that runs when the login button is clicked.
   */
  function login() {
    toggleActiveLogin();
    qsa(".close-button")[0].addEventListener("click", toggleActiveLogin);
    qs(".login-official").addEventListener("click", loginOfficial);
  }

  /**
   * Function that runs when the signout button is clicked.
   * it displays the webpage as if its not logged in.
   */
  async function signout() {
    try{
      let username = localStorage.key(0);
      let password = JSON.parse(localStorage.getItem(username))[0];
      let params = new FormData();

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
      handleSignoutErr(error);
    }
  }

  /**
   * The official login function that sends a fetch request to the server to log in the user.
   * It also saves the user's password if the user wants to save it.
   */
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
          loginOfficialHelper(result, username, password, saveUser);
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
   * Helper function that helps with the login function.
   * @param {Object} result - result from the fetch request
   * @param {Object} username - username of the user
   * @param {Object} password - password of the user
   */
  function loginOfficialHelper(result, username, password, saveUser) {
    if (result.status === 200) {
      toggleActiveLogin();
      id("login").classList.add("hidden");
      id("display-login").classList.add("hidden");
      id("signout").classList.remove("hidden");
      id("displayUser").textContent = "Welcome, " + username;
      id("displayUser").classList.remove("hidden");
      let localStorageData = [password, saveUser];
      window.localStorage.setItem(username, JSON.stringify(localStorageData));
    } else {
      id("error-message").textContent = data.message;
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

  /**
   *  Function that handles the error when the user tries to sign out.
   * @param {Object} err - error object that is thrown
   */
  function handleSignoutErr(err) {
    let frame = qs("body");
    frame.innerHTML = ' ';
    let error = document.createElement("p");
    error.textContent = "Unable to sign out user due to error: " + err;
    frame.appendChild(error);
  }

  /**
   * Function that handles the error when the user tries to log in.
   * @param {Object} err - error object that is thrown
   */
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

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} query - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }

})();