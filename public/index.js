/**
 * Name: Jimmy Le & Henok Assalif
 * Date: June 4th, 2024
 * Section: CSE 154 AE Peter Oh & Kasten Welsh
 *
 * This file contains the JavaScript code for the index page of the application.
 * It includes functions for initializing the page, handling user interactions,
 * fetching data from the server, and displaying the search results and enrolled courses.
 */

"use strict";

(function() {
  let filterArrDate = [];
  let filterArrSubject = [];
  let filterArrCredit = [];
  let filterArrCourseLevel = [];
  let dayMap = new Map([["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["Th", "Thursday"],
                                                                                  ["F", "Friday"]]);
  const USER_ERROR_CODE = 400;
  const SUCCESS_CODE = 200;
  const SECONDS = 2000;
  const BEGINNING_ALPHABET = 65;
  const HEIGHTPERMIN = 2.216666666666667;
  const MININHOUR = 60;

  let mainArray = {
    "Course level": filterArrCourseLevel,
    "Subjects": filterArrSubject,
    "Credits": filterArrCredit,
    "Days": filterArrDate
  };

  window.addEventListener("load", init);

  /** Function that runs when the page is loaded and sets up other functions. */
  async function init() {
    checkLogin();
    id("login").addEventListener("click", login);
    id("course-input").addEventListener("input", search);
    id("signout").addEventListener("click", signout);
    id("search-button").addEventListener("click", fetchSearchBar);
    id("visual-schedule").addEventListener("click", openTransaction);
    id("visual").addEventListener("click", openSchedule);
    id("reset-button").addEventListener("click", () => {
      id("classes").innerHTML = '';
      load();
      id("reset-button").classList.add("hidden");
    });
    load();
    await checkForFilter();
  }

  /**
   * Function that toggles the pop up page for the users enrolled courses.
   */
  function toggleEnrolledTransaction() {
    id("pop-up-enroll").classList.toggle("active");
    id("overlay3").classList.toggle("active");
  }

  /**
   * Function that opens the users enrolled course page if and only if the user is logged in.
   */
  async function toggleEnrolledTransaction2() {
    id("pop-up-schedule").classList.toggle("active");
    id("overlay3").classList.toggle("active");

    /*
     * manipulate the page using api info
     * get all course info.
     */
    try {
      let userName = localStorage.key(0);
      let result = await fetch("/getSchedule/" + userName);
      await statusCheck(result);
      let data = await result.json();
      populateSchedule(data);
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * Populates the schedule page with the courses that the user has enrolled in.
   * @param {JSON} data The courses in json format that the user has enrolled in.
   */
  function populateSchedule(data) {
    let allul = qsa(".schedule-group ul");

    // Clear all the days in the schedule
    for (let i = 0; i < allul.length; i++) {
      allul[i].innerHTML = '';
    }

    for (let i = 0; i < data.length - 1; i++) {
      let courseObj = data[i];
      let classKey = Object.keys(courseObj);

      // later add feature to enable clickable modal to show more info (such as description)
      let className = classKey[0];
      let classDate = courseObj[classKey].date;
      let classCredit = courseObj[classKey].credits;
      let classDescription = courseObj[classKey].description;
      let currCourseDOMAndDate =
                            constructSchedule(className, classDate, classCredit, classDescription);
      let days = currCourseDOMAndDate[1];

      // adding class to each day of the week it occurs
      for (let j = 0; j < days.length; j++) {
        // **Create a new instance for each day**
        let courseDOM = constructSchedule(className, classDate, classCredit, classDescription)[0];
        placeNewClass(courseDOM, days[j]);
      }
    }

    // Set the position of class and time containers to relative
    qs(".schedule-timeline").style.position = "relative";

    // Postion the classes based on time
    let allClasses = qsa(".schedule-event");

    for (let i = 0; i < allClasses.length; i++) {
      let aClass = allClasses[i];
      aClass.parentNode.parentNode.style.position = "relative";
      aClass.style.position = "absolute";
      fixPosition(aClass);
    }
  }

  /**
   * Places the class at the correct time in the schedule.
   * @param {HTMLElement} aClass - The class to be positioned in the schedule.
   */
  function fixPosition(aClass) {
    let time = aClass.querySelector("a").getAttribute("date-start");
    let allTimes = qsa(".schedule-time");
    for (let i = 0; i < allTimes.length; i++) {
      let scheduleTime = allTimes[i].querySelector("span").textContent;
      if (scheduleTime === time) {
        aClass.style.top = allTimes[i].offsetTop + "px";
        aClass.style.left = "15px";

        // Fix the height of the class
        let endTime = aClass.querySelector("a").getAttribute("date-end");
        let totalMin = convertMilitaryTimeToMinutes(endTime) - convertMilitaryTimeToMinutes(time);
        let height = (HEIGHTPERMIN) * totalMin;

        aClass.style.height = height + "px";
        // eslint-disable-next-line no-restricted-syntax
        break;
      }
    }
  }

  /**
   * Convert the time string to minutes.
   * @param {String} timeString - The time string to be converted to minutes.
   * @returns {String} - A number representing the time in minutes.
   */
  function convertMilitaryTimeToMinutes(timeString) {
    // Split the time string into hours and minutes
    const [hours, minutes] = timeString.split(':');

    // Convert hours and minutes to integers
    const hoursInMinutes = parseInt(hours, 10) * MININHOUR;
    const totalMinutes = hoursInMinutes + parseInt(minutes, 10);

    return totalMinutes;
  }

  /**
   * Creates the HTML for a single course in the schedule.
   * @param {String} className - The name of the class.
   * @param {String} classDate - A formated string of the class date info.
   * @param {String} classCredit - Credit for the class
   * @param {String} classDescription - Description for the class
   * @returns {Array} - An array containing the DOM object for the course and the days the class
   */
  function constructSchedule(className, classDate, classCredit, classDescription) {
    // Creating the main container for the course
    let newClass = document.createElement("li");
    newClass.classList.add("schedule-event");

    // Using a link to store class information
    let classInfo = document.createElement("a");

    // storing the class name and date in the link
    let dateTime = classDate.split(/\s{2}/);
    let days = dateTime[0].split(" ");
    let startTime = dateTime[1].split("-")[0];
    let endTime = dateTime[1].split("-")[1];
    classInfo.setAttribute("date-start", startTime);
    classInfo.setAttribute("date-end", endTime);
    classInfo.setAttribute("href", "#0");

    classInfo.onclick = function() {
      openCoursePopup(className, classDate, classCredit, classDescription);
    };

    // Creating the course name element
    let courseName = document.createElement("em");
    courseName.classList.add("schedule-name");
    courseName.textContent = className;

    // Linking HTML together
    classInfo.appendChild(courseName);
    newClass.appendChild(classInfo);
    return [newClass, days];
  }

  /**
   * openCoursePopup constructs the DOM structure of the pop up modal of the info from the specifi
   * class the user selects.
   * @param {String} className - The name of the class.
   * @param {String} classDate - A formated string of the class date info.
   * @param {String} classCredit - Credit for the class
   * @param {String} classDescription - Description for the class
   */
  function openCoursePopup(className, classDate, classCredit, classDescription) {
    let popup = document.getElementById('course-popup');
    let overlay = document.getElementById('overlay4');

    // Populate the popup with course details
    document.getElementById('popup-course-name').textContent = className;
    let dateTime = classDate.split(/\s{2}/);
    let days = dateTime[0];
    let time = dateTime[1];

    document.getElementById('popup-course-description').innerHTML =
                                      `<strong>Description:</strong> ${classDescription}`;
    document.getElementById('popup-course-credit').innerHTML =
                                               `<strong>Credits:</strong> ${classCredit}`;
    document.getElementById('popup-course-date').innerHTML = `<strong>Days:</strong> ${days}`;
    document.getElementById('popup-course-time').innerHTML = `<strong>Time:</strong> ${time}`;

    // Show the popup and overlay
    popup.style.display = 'block';
    overlay.style.display = 'block';

    // Set up the event listener for the Remove Course button
    document.getElementById('remove-course-btn').onclick = function() {
      removeCourseFromSchedule(className, days);
    };

    // Close the popup when clicking the close button
    document.getElementById('close-popup').onclick = function() {
      closeCoursePopup();
    };

    // Close the popup when clicking outside of it
    overlay.onclick = function() {
      closeCoursePopup();
    };
  }

  /**
   * closes the pop up for the visual schedule details of a class.
   */
  function closeCoursePopup() {
    let popup = document.getElementById('course-popup');
    let overlay = document.getElementById('overlay4');
    popup.style.display = 'none';
    overlay.style.display = 'none';
  }

  /**
   * Removes a course from the user's visual schedule and updates the db properly to account for
   * this.
   * @param {String} className - name of the class
   * @param {String} days - the specific days of the class
   */
  async function removeCourseFromSchedule(className, days) {
    let userName = localStorage.key(0);
    let formData = new FormData();
    formData.append("userName", userName);
    formData.append("className", className);

    try {
      let result = await fetch("/removeCourse", {method: "POST", body: formData});
      await statusCheck(result);

      // Remove the course from the visual schedule
      days.split(" ").forEach(day => {
        let dayContainer = id(dayMap.get(day));
        let classElements = dayContainer.querySelectorAll('.schedule-event');
        classElements.forEach(classElement => {
          if (classElement.querySelector("em").textContent === className) {
            classElement.remove();
          }
        });
      });

      // Close the popup after removing the course
      closeCoursePopup();

    } catch (error) {
      console.error("Error removing course:", error);
      handleErr(error);
    }
  }

  /**
   * Places the class in the correct day of the week in HTML
   * @param {HTMLLIElement} classDOM - The class DOM object to be placed in the schedule
   * @param {String} day - Short names for days of the week for the class
   */
  function placeNewClass(classDOM, day) {
    // Map short day names to full day names
    let dayLong = dayMap.get(day);
    let dayContainer = id(dayLong);

    // Add class to the correct day container
    dayContainer.appendChild(classDOM);
  }

  /**
   * Function that opens the users enrolled course page if and only if the user is logged in.
   * It also handles the event in which you exit out of the page.
   */
  async function openTransaction() {

    if (localStorage.length === 0) {
      id("error-message-enroll").textContent = "You must be logged in to view your " +
                                               "enrolled courses.";
      id("error-message-enroll").classList.add("error");
    } else {
      // check if there contains things in the courseHistory if not then display
      // a error
      let containsHistory = await fetch('/courseHistory?username=' + localStorage.key(0));
      if (containsHistory.status === USER_ERROR_CODE) {
        id("error-message-enroll").textContent = "User does not have any available classes. Please enroll in some.";
        id("error-message-enroll").classList.add("error");
      } else {
        id("error-message-enroll").textContent = "";
        qs(".pop-up-body-enroll").innerHTML = "";
        qs(".close-button2").addEventListener("click", toggleEnrolledTransaction);
        await fetchEnrolledCourses();
      }

    }
  }

  /**
   * Function that opens the users enrolled course page if and only if the user is logged in.
   */
  async function openSchedule() {
    if (localStorage.length === 0) {
      id("error-message-enroll").textContent = "You must be logged in to view your " +
                                               "enrolled courses.";
      id("error-message-enroll").classList.add("error");
    } else {
      let containsHistory = await fetch('/courseHistory?username=' + localStorage.key(0));
      if (containsHistory.status === USER_ERROR_CODE) {
        id("error-message-enroll").textContent = "Cannot view schedule. User does not have classes, please enroll in some.";
        id("error-message-enroll").classList.add("error");
      } else {
        qs(".close-button3").addEventListener("click", toggleEnrolledTransaction2);
        await toggleEnrolledTransaction2();
      }
    }
  }

  /**
   * This method fetches the enrolled courses for the user and displays them on the page.
   * If the user has not enrolled in any courses, it will display an error message.
   *
   */
  async function fetchEnrolledCourses() {
    try {
      let username = localStorage.key(0);
      let result = await fetch("/previousTransactions?username=" + username);
      if (result.status === USER_ERROR_CODE) {
        id("error-message-enroll").textContent = "You have not enrolled in any courses.";
        id("error-message-enroll").classList.add("error");
      } else {
        toggleEnrolledTransaction();
        let data = await result.json();
        let enroll = qs(".pop-up-body-enroll");
        let userTransactionCodes = Object.keys(data);
        parseOutAndAppendTransaction(data, enroll, userTransactionCodes);
      }
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * This is a helper method for fetchEnrolledCourses() which parses the sent back data and stores
   * it in a array where it will display the transaction history of a user from most recent
   * to oldest.
   * @param {Object} data - Object that contains the data for the user's enrolled courses
   * @param {Object} enroll - DOM object that represents the pop up page for the user's
   *                          enrolled courses
   * @param {Object} userTransactionCodes - Array of keys for the data (i.e transactionCodes)
   */
  // eslint-disable-next-line max-lines-per-function, require-jsdoc
  async function parseOutAndAppendTransaction(data, enroll, userTransactionCodes) {
    // getting most recent transaction code first
    let username = localStorage.key(0);
    try {
      let result = await fetch("/getSchedule/" + username);
      await statusCheck(result);
      let scheduleData = await result.json();
      let mostRecentTransaction = scheduleData[scheduleData.length - 1]; // get most recent code

      let DOMarr = [];
      for (let i = 0; i < userTransactionCodes.length; i++) {
        let currTCode = userTransactionCodes[i];
        let mostRecentCode = currTCode === mostRecentTransaction;

        // array of keys
        let obj = {};
        obj[currTCode] = [];

        // creating each course card for each transaction code
        for (let j = 0; j < data[currTCode].length; j++) {
          let currObj = data[currTCode][j];
          let currCourseDOM = constructEnrolledCourses(currObj, mostRecentCode);
          obj[currTCode].unshift(currCourseDOM);
        }
        DOMarr.unshift(obj);
      }

      for (let i = 0; i < DOMarr.length; i++) {
        let currentObj = DOMarr[i];
        let currentTCodeAndDate = Object.keys(currentObj)[0];
        let currentTCode = currentTCodeAndDate.split("  ")[0];
        let currentTDate = currentTCodeAndDate.split("  ")[1];
        let currDOMs = currentObj[currentTCodeAndDate]; // getting DOMs by code + date key

        let codeDateHeader = document.createElement("div");
        let tCode = document.createElement("p");
        let tDate = document.createElement("button");
        let tDateText = document.createElement("span");
        let tDateUpdateText = document.createElement("span");

        tCode.textContent = currentTCode;
        tCode.classList.add("enrolled-content");
        tCode.classList.add("tCode-title");

        tDate.classList.add("enrolled-content");
        tDate.classList.add("tDate-title");
        tDate.addEventListener("click", updateToRequestedSchedule);

        tDateText.textContent = currentTDate;
        tDateUpdateText.textContent = "Make this your current schedule";
        tDateText.classList.add("old-text");
        tDateUpdateText.classList.add("new-text");

        codeDateHeader.appendChild(tCode);
        codeDateHeader.appendChild(tDate);

        tDate.appendChild(tDateText);
        tDate.appendChild(tDateUpdateText);

        codeDateHeader.classList.add("code-date-header");

        enroll.appendChild(codeDateHeader);
        for (let j = 0; j < currDOMs.length; j++) {
          let currDOM = currDOMs[j];
          enroll.appendChild(currDOM);
        }
      }
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * This method constructs the enrolled courses for the user and returns it as a DOM object.
   * @param {Object} data - Object that contains the data for the enrolled courses
   * @param {Boolean} mostRecentCode - Boolean representing whether or not the transaction code
   * @returns {Object} - A fully built DOM object that represents the enrolled courses
   */
  // eslint-disable-next-line max-lines-per-function, require-jsdoc
  function constructEnrolledCourses(data, mostRecentCode) {
    let key = Object.keys(data)[0];
    let mainBody = document.createElement("article");
    mainBody.classList.add("enrolled-content");
    if (mostRecentCode) {
      mainBody.classList.add("most-recent");
    }

    let courseName = document.createElement("h2");
    courseName.textContent = key;

    let courseDescription = document.createElement("p");
    courseDescription.textContent = "Description: " + data[key].description;

    let courseSubject = document.createElement("p");
    courseSubject.textContent = "Subject: " + data[key].subject;

    let courseDate = document.createElement("p");
    courseDate.textContent = "Days: " + data[key].date.split(/\s{2}/)[0] +
                             " | Time: " + data[key].date.split(/\s{2}/)[1];

    let courseSeats = document.createElement("p");
    courseSeats.textContent = "Available Seats: " + data[key].availableSeats;

    let courseCredits = document.createElement("p");
    courseCredits.textContent = "Credits: " + data[key].credits;

    if (mostRecentCode) {
      let mostRecent = document.createElement("button");
      mostRecent.addEventListener("click", removeCourse);

      /*
       * TODO: add event listener to remove the most recent course
       * in the logic reload the user transaction page
       */
      mostRecent.textContent = "Remove Course";
      mostRecent.classList.add("most-recent-button");
      mainBody.appendChild(courseName);
      mainBody.appendChild(courseDescription);
      mainBody.appendChild(courseSubject);
      mainBody.appendChild(courseDate);
      mainBody.appendChild(courseSeats);
      mainBody.appendChild(courseCredits);
      mainBody.appendChild(mostRecent);

    } else {
      mainBody.appendChild(courseName);
      mainBody.appendChild(courseDescription);
      mainBody.appendChild(courseSubject);
      mainBody.appendChild(courseDate);
      mainBody.appendChild(courseSeats);
      mainBody.appendChild(courseCredits);
    }
    return mainBody;
  }

  /**
   * Function that fetches the search results based on the search term and displays them on the
   * page.
   */
  async function removeCourse() {
    let username = localStorage.key(0);
    let className = this.parentNode.firstElementChild.textContent;
    let formData = new FormData();
    formData.append("userName", username);
    formData.append("className", className);
    try {
      let result = await fetch("/removeCourse", {method: "POST", body: formData});
      await statusCheck(result);
      let data = await result.json();

      // add a success attribute to tell the user they have successfully removed a class.
      let successMsg = document.createElement("div");
      successMsg.classList.add("success");
      successMsg.textContent = "Successful removing a class! Your enrollment receipt code is: '" +
                               data.split(" ")[0] + "'";

      this.parentNode.previousElementSibling.insertAdjacentElement('beforebegin', successMsg);

      // adding a delay so user can see the success enrollment before it
      // updatesthe user transaction screen immediately.
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateUserTransaction(username);

    } catch (error) {
      console.error("Error Message FrontEnd:", error);
      handleErr(error);
    }
  }

  /**
   * Function that fetches to the server the specific search based on the searchTerm that was
   * passed. It then displays the courses that match the search term.
   */
  async function fetchSearchBar() {
    try {
      let searchTerm = id("course-input").value.trim();
      let result = await fetch("/search?className=" + searchTerm);
      if (result.status === 400) {
        // clear the inner HTML and display a error saying no classes such found.
        let classList = id("classes");
        classList.innerHTML = '';
        let errorTitle = document.createElement("h2");
        errorTitle.textContent = "No such classes found for: " + searchTerm;
        errorTitle.classList.add('error');
        classList.append(errorTitle);
      } else {
        let data = await result.json();
        let classList = id("classes");
        classList.innerHTML = '';
        for (let i = 0; i < data.classes.length; i++) {
          let currObj = data.classes[i];
          let currCourseDOM = constructCourse(currObj);
          currCourseDOM.addEventListener('click', openCourse);
          classList.appendChild(currCourseDOM);
        }
        id("reset-button").classList.remove("hidden");
      }
    } catch (err) {
      handleErr(err);
    }
  }

  /**
   * Function that adds event listeners on every filter checkbox. If any are clicked then
   * it will call filterSearch to determine whether or not we need to filter.
   */
  async function checkForFilter() {
    let allBoxes = document.querySelectorAll('.filter-check-boxes input[type="checkbox"]');
    for (let i = 0; i < allBoxes.length; i++) {
      allBoxes[i].addEventListener('change', await filterSearch);
    }
  }

  /**
   * filterSearch is a function that is called when a checkbox is clicked. It will determine
   * whether or not we need to filter the search based on the checkbox that was clicked.
   * If the checkbox is checked, we will callBuildSearch. If the checkbox is unchecked, we will
   * call buildSearch with a null value.
   */
  async function filterSearch() {
    let category = this.parentNode.previousElementSibling.textContent.split(":")[0];
    if (this.checked) {
      await buildSearch(category, this);
    } else {
      mainArray[category].shift();
      await buildSearch(category, null);
    }
  }

  /**
   * buildSearch is a function that is called when a checkbox is clicked. It will determine if
   * there are any boxes applied, if so, it will build a string fetch request based on
   * all of the checkboxes that was applied and call fetchSearch to fetch the actual search.
   * @param {String} category - String representing the category that was clicked
   * @param {Boolean} checkbox - True/false on if the checkbox was clicked
   */
  async function buildSearch(category, checkbox) {
    if (checkbox !== null) {
      mainArray[category].unshift(checkbox.nextElementSibling.textContent);
    }
    if (!isMainArrEmpty()) {
      let buildQuery = "";
      let keys = Object.keys(mainArray);
      const keyPairing = {
        "Days": "date",
        "Credits": "credits",
        "Subjects": "subject",
        "Course level": "courseLevel"
      };
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let currArr = mainArray[key];
        if (currArr.length !== 0) {
          // here we know there is a boxed checked in this section filter
          buildQuery += (keyPairing[key] + "=" + JSON.stringify(currArr) + "&");
        }
      }

      // remove any potential last char which could be a &
      if (buildQuery.endsWith("&")) {
        buildQuery = buildQuery.slice(0, -1);
      }
      await fetchSearch(buildQuery);
    } else {
      let classList = id("classes");
      classList.innerHTML = '';
      load();
    }
  }

  /**
   * fetchSearch is a function that is called when we need to fetch the search based on the
   * checkboxes that were clicked. It will fetch the search and display the courses that match
   * the search. Otherwise display a message indicated no classes were found for the specific
   * search.
   * @param {String} buildQuery - String representing the query that was built
   *                              from the checkboxes to fetch
   */
  async function fetchSearch(buildQuery) {
    try {
      let searchbar = id("course-input").value.trim();
      let result;
      if (searchbar !== '') {
        result = await fetch("/search?className=" + searchbar + "&" + buildQuery);
      } else {
        result = await fetch("/search?" + buildQuery);
      }
      let classList = id("classes");
      if (result.status === SUCCESS_CODE) {
        let data = await result.json();

        /**
         * check if the response back is a empty array if so we need to display
         * there are no class for the specified filters.
         */
        classList.innerHTML = '';
        for (let i = 0; i < data.classes.length; i++) {
          let currObj = data.classes[i];
          let currCourseDOM = constructCourse(currObj);
          currCourseDOM.addEventListener('click', openCourse);
          classList.appendChild(currCourseDOM);
        }
      } else if (result.status === USER_ERROR_CODE) {
        classList.innerHTML = '';
        let noClass = document.createElement("h2");
        noClass.textContent = "No classes found for the specified filters/search.";
        noClass.classList.add('error');
        classList.appendChild(noClass);
      }
    } catch (err) {
      handleErr(err);
    }
  }

  /**
   * Helper method used in buildSearch to determine whether or not we need to build a search.
   * @returns {Boolean} - True/false if the main array containing our categories of checkboxes
   *                      is empty.
   */
  function isMainArrEmpty() {
    let keys = Object.keys(mainArray);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let currArr = mainArray[key];
      if (currArr.length !== 0) {
        return false; // If any inner array is not empty, return false
      }
    }
    return true; // If all inner arrays are empty, return true
  }

  /**
   * Function is used on reload to check if the user is logged in. If so,
   * it will display the user's name and hide the login button as if the user
   * is already logged in.
   */
  function checkLogin() {
    let key = localStorage.key(0);
    if (key) {
      if (JSON.parse(localStorage.getItem(key))[1]) {
        id("display-login").classList.add("hidden");
        id("login").classList.add("hidden");
        id("signout").classList.remove("hidden");
        id("display-user").textContent = "Welcome, " + key;
        id("display-user").classList.remove("hidden");
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
      handleErr(err);
    }
  }

  /**
   * Function that toggles the pop up page for each course class user clicks.
   */
  function toggleCoursePage() {
    qsa('.title')[1].textContent = '';
    qs('.body-course').textContent = '';
    let errormsg = document.createElement('div');
    errormsg.id = "error-message-course";
    qs('.body-course').appendChild(errormsg);
    id("error-message").textContent = '';
    id("pop-up-courses").classList.toggle("active");
    id("overlay2").classList.toggle("active");
  }

  /**
   * Function that connects sub functions to create the pop up and functionality
   * of the pop up for a specific course. It toggles the pop up and calls
   * a helper method to fetch the required data
   */
  function openCourse() {
    toggleCoursePage();
    qsa(".close-button")[1].addEventListener("click", toggleCoursePage);
    let title = document.createTextNode(this.querySelector("h2").textContent + " - " +
                this.querySelector("p").textContent);
    qsa('.title')[1].appendChild(title);
    fetchCoursePage();
  }

  /**
   * fetchCoursePage fetches the specific course data based on the course short name.
   * It then constructs the overall course overview and course sections.
   */
  async function fetchCoursePage() {
    try {
      let courseName = qsa('.title')[1].textContent.split(' - ')[0].trim();
      let response = await fetch("/itemDetails/" + courseName);
      await statusCheck(response);
      let data = await response.json();

      // title for overview
      let h3OverviewTitle = document.createElement("h3");
      h3OverviewTitle.textContent = "Course Overview";
      h3OverviewTitle.classList.add("title-overview");

      // title for course sections
      let h3SectionTitle = document.createElement("h3");
      h3SectionTitle.textContent = courseName + " Course Sections";
      h3SectionTitle.classList.add("title-overview-sec");

      let coursePageOverviewDOM = constructCoursePageOverview(data[0]);
      let courseSections = constructCourseSection(data);

      qs('.body-course').appendChild(h3OverviewTitle);
      qs('.body-course').appendChild(coursePageOverviewDOM);
      qs('.body-course').appendChild(h3SectionTitle);
      courseSections.insertBefore(courseSectionHeader(), courseSections.firstChild);
      qs('.body-course').appendChild(courseSections);
    } catch (err) {
      handleErr(err);
    }
  }

  /**
   * This method constructs the course section for every class with that shortname.
   * @param {Object} data - Array representing the possible classes with the shortname
   * @returns {Object} - a fully built DOM representing the entire DOM for each course section.
   */
  function constructCourseSection(data) {
    // main body in which each class section will be in
    let overviewContentSec = document.createElement("section");
    overviewContentSec.classList.add("overview-content-sec");
    for (let i = 0; i < data.length; i++) {
      let currentClass = data[i];
      let classSecDOM = constructCourseSectionHelper(currentClass, i);
      overviewContentSec.appendChild(classSecDOM);
    }
    return overviewContentSec;
  }

  /**
   * This method creates a DOM element with the specified tag, text content, and CSS class.
   * @param {string} tag - The HTML tag of the element.
   * @param {string} text - The text content of the element.
   * @param {string} className - The CSS class of the element.
   * @returns {HTMLElement} - The created DOM element.
   */
  function createElement(tag, text, className) {
    let element = document.createElement(tag);
    element.textContent = text;
    if (className) {
      element.classList.add(className);
    }
    return element;
  }

  /**
   * This method constructs the header you see above the course section detail.
   * @returns {HTMLElement} - The constructed course section header.
   */
  function courseSectionHeader() {
    let classContainer = document.createElement("article");
    classContainer.classList.add("courseHeader-sec-detail");

    // Create each header element using the createElement function
    classContainer.appendChild(createElement("p", "Section", "course-sec-header"));
    classContainer.appendChild(createElement("p", "Credits", "course-sec-header"));
    classContainer.appendChild(createElement("p", "Days", "course-sec-header"));
    classContainer.appendChild(createElement("p", "Time", "course-sec-header"));
    classContainer.appendChild(createElement("p", "Seats", "course-sec-header"));
    classContainer.appendChild(createElement("p", "Enroll", "course-sec-header"));

    return classContainer;
  }

  /**
   * This method constructs a paragraph element with the specified text content and CSS class.
   * @param {string} text - The text content of the paragraph.
   * @param {string} className - The CSS class of the paragraph.
   * @returns {HTMLParagraphElement} - The constructed paragraph element.
   */
  function createParagraph(text, className) {
    let paragraph = document.createElement("p");
    paragraph.textContent = text;
    paragraph.classList.add(className);
    return paragraph;
  }

  /**
   * This method constructs a checkbox input element for course enrollment.
   * @param {boolean} isVisible - Indicates whether the enrollment box should be visible
   *                              based on available seats.
   * @returns {HTMLInputElement} - The constructed checkbox input element.
   */
  function createEnrollmentBox(isVisible) {
    let enrollmentBox = document.createElement("input");
    enrollmentBox.type = "checkbox";
    enrollmentBox.className = "enrollBox course-sec-info";
    enrollmentBox.name = "enrollBox";
    if (!isVisible) {
      enrollmentBox.classList.add("hide");
    }
    enrollmentBox.addEventListener('change', openEnrollment);
    return enrollmentBox;
  }

  /**
   * This method constructs the hidden paragraph element containing the class ID.
   * @param {string} classId - The ID of the class.
   * @returns {HTMLParagraphElement} - The constructed hidden paragraph element.
   */
  function createHiddenId(classId) {
    let hiddenId = document.createElement("p");
    hiddenId.textContent = classId;
    hiddenId.id = "hiddenId";
    hiddenId.classList.add("hidden");
    return hiddenId;
  }

  /**
   * This method constructs the class container element with all the necessary information.
   * @param {Object} currentClass - Object representing the current class from the array of classes.
   * @param {Integer} index - Indicating which section ID we are.
   * @returns {HTMLElement} - Fully built DOM of the specific class information needed to
   *                          append to the main view.
   */
  function constructCourseSectionHelper(currentClass, index) {
    let classContainer = document.createElement("article");
    classContainer.classList.add("course-sec-detail");

    let courseSection = createParagraph(indexToAlphabet(index), "course-sec-info");
    let courseCred = createParagraph(currentClass.credits, "course-sec-info");
    let courseDays = createParagraph(currentClass.date.split(/\s{2}/)[0], "course-sec-info");
    let courseTime = createParagraph(currentClass.date.split(/\s{2}/)[1], "course-sec-info");
    let courseCapacity = createParagraph(currentClass.availableSeats + "/" +
                                        currentClass.totalSeats, "course-sec-info");
    let courseEnrollmentBox = createEnrollmentBox(currentClass.availableSeats !== 0);
    let hiddenId = createHiddenId(currentClass.id);

    classContainer.appendChild(courseSection);
    classContainer.appendChild(courseCred);
    classContainer.appendChild(courseDays);
    classContainer.appendChild(courseTime);
    classContainer.appendChild(courseCapacity);
    classContainer.appendChild(courseEnrollmentBox);
    classContainer.appendChild(hiddenId);
    return classContainer;
  }

  /**
   * Function calls showEnrollButton if a current checkbox is clicked.
   * Otherwise it will check if user deselected all buttons. If so it will
   * hide the enrollment button.
   */
  function openEnrollment() {
    if (this.checked) {
      showEnrollButton();
    } else {
      let allEnrollBox = qsa('.enrollBox');
      let allUnchecked = false;
      for (let i = 0; i < allEnrollBox.length; i++) {
        let currentEnrollBox = allEnrollBox[i];
        if (currentEnrollBox.checked) {
          allUnchecked = true;
        }
      }
      if (!allUnchecked) {
        qs('.enrollButton').classList.add("hidden");
      }
    }
  }

  /**
   * This function shows the enroll button if it is not already shown.
   */
  function showEnrollButton() {
    if (qs('.enrollButton') === null) {
      let enrollButton = document.createElement("button");
      enrollButton.textContent = "Enroll";
      enrollButton.classList.add("enrollButton");
      enrollButton.addEventListener('click', enrollOfficial);
      qs('.body-course').appendChild(enrollButton);
    } else {
      qs('.enrollButton').classList.remove("hidden");
    }
  }

  /**
   * This function officially enrolls the user in the class by calling a POST fetch
   * request. It will determine whether or not it was a success. If it failed,
   * it will properly display the desired error message.
   */
  async function enrollOfficial() {
    try {
      if (enrollmentSafetyCheck()) {
        let params = new FormData();
        let username = localStorage.key(0);
        let className = qsa('.title')[1].textContent.split(' - ')[0].trim();

        /**
         * determine which hidden id you are referring to this will be based on the current
         * checkbox you have selected.
         */
        let checkedBox = document.querySelector('.enrollBox:checked');
        let userId = checkedBox.parentNode.querySelector('#hiddenId').textContent;
        params.append("userName", username);
        params.append("className", className);
        params.append("id", userId);
        let response = await fetch("/enrollCourse", {method: "POST", body: params});
        if (response.status === SUCCESS_CODE) {

          /**
           * Success display message that it was successful and after 2 seconds
           * close the course page
           */
          let successMsg = document.createElement("div");
          successMsg.classList.add("success");
          successMsg.textContent = "Success enrollment! Your enrollment receipt code is: '" +
                                    await response.text() + "'";

          id('error-message-course').insertAdjacentElement('afterend', successMsg);
          enrollOfficialHelper();
        } else {
          id("error-message-course").textContent = await response.text();
          id("error-message-course").classList.add("error");
        }
      }
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * Helper method for enrollOfficial which essentially deselects any buttons once the
   * user hits enroll and automatically closes the page after 2 seconds.
   */
  function enrollOfficialHelper() {
    // uncheck the box
    let allEnrollBox = qsa('.enrollBox');
    for (let i = 0; i < allEnrollBox.length; i++) {
      allEnrollBox[i].checked = false;
    }

    // after two seconds close the page for the user:
    setTimeout(() => {
      if (id("pop-up-courses").classList.contains("active") &&
          id("overlay2").classList.contains("active")) {
        toggleCoursePage();
      }
    }, SECONDS);
  }

  /**
   * This function is used to detect whether or not the enrollment was a success.
   * Otherwise it will display the appropriate error message.
   * @returns {Boolean} - True if the user is able to enroll, false otherwise.
   */
  function enrollmentSafetyCheck() {
    // check if user is logged in
    if (localStorage.length === 0) {
      id("error-message-course").textContent = "You must be logged in to enroll.";
      id("error-message-course").classList.add("error");
      return false;
    }

    // check if user did not select more than 1.
    let checkedBox = qsa('.enrollBox');
    let countChecked = 0;
    for (let i = 0; i < checkedBox.length; i++) {
      if (checkedBox[i].checked) {
        countChecked++;
      }
    }
    if (countChecked > 1) {
      id("error-message-course").textContent = "You cannot select more " +
                                              "than one of the same course.";
      id("error-message-course").classList.add("error");
      return false;
    }

    // everything is good time to enroll!
    return true;
  }

  /**
   * This function updates the current schedule to the requested schedule.
   */
  async function updateToRequestedSchedule() {
    try {

      // Created a form data object to send the username and the code to the server
      let username = localStorage.key(0);
      let code = this.parentNode.querySelector("p").textContent;
      let date = this.querySelector(".old-text").textContent;
      let fullCode = code + "  " + date;
      let params = new FormData();
      params.append("userName", username);
      params.append("fullCode", fullCode);

      // Fetch the request to update the schedule
      let response = await fetch("/updateByCode", {method: "POST", body: params});
      if (response.status === SUCCESS_CODE) {

        /**
         * Success display message that it was successful and after 2 seconds
         * close the course page
         */
        let successMsg = document.createElement("div");
        successMsg.classList.add("success");
        successMsg.textContent = "Success enrollment! Your enrollment receipt code is: '" +
                                  await response.text() + "'";

        this.parentNode.insertAdjacentElement('beforebegin', successMsg);

        // adding a delay so user can see the success enrollment before it
        // updatesthe user transaction screen immediately.
        await new Promise(resolve => setTimeout(resolve, 1000));

        // update theuser transaction by fetching current course history and clearing
        // what we have so far and displaying new course history.
        updateUserTransaction(username);
      } else {
        let errorMessage = document.createElement("div");
        errorMessage.textContent = await response.text();
        this.parentNode.insertAdjacentElement('beforebegin', errorMessage);
        errorMessage.classList.add("error");
      }

    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * Method that fetches the course history and updates the pop up of the user transaction
   * to be the newest one.
   */
  async function updateUserTransaction(username) {
    try {
      let result2 = await fetch("/previousTransactions?username=" + username);
      await statusCheck(result2);
      let data = await result2.json();
      let enroll = qs(".pop-up-body-enroll");
      enroll.innerHTML = "";
      let userTransactionCodes = Object.keys(data);
      parseOutAndAppendTransaction(data, enroll, userTransactionCodes);
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * Method that converts a given integer to its respective alphabet
   * @param {Integer} index - Index representing the aphabet to be converted to
   * @returns {String} - The alphabet that corresponds to the index.
   */
  function indexToAlphabet(index) {
    return String.fromCharCode(BEGINNING_ALPHABET + index);
  }

  /**
   * Function that returns the course overview for a specific course.
   * @param {Object} data - object that contains the course overview information
   * @returns {Object} - DOM object that contains the course overview information
   */
  function constructCoursePageOverview(data) {
    // Create a section element for the overview content
    let overviewContent = document.createElement("section");
    overviewContent.classList.add("overview-content");

    // Create containers for different sections of the course overview

    // Container for course description
    let containerDesc = createContainer("Course Description: ");
    let courseDesc = createParagraph(data.description, "course-desc");
    containerDesc.appendChild(courseDesc);

    // Container for course credits
    let containerCreds = createContainer("Course Credits: ");
    let courseCredits = createParagraph(data.credits, "course-desc");
    containerCreds.appendChild(courseCredits);

    // Container for course level
    let containerLevel = createContainer("Course Level:");
    let courseLevel = createParagraph(data.courseLevel, "course-desc");
    containerLevel.appendChild(courseLevel);

    // Container for average GPA
    let containerGPA = createContainer("Average GPA: ");
    let averageGPA = createParagraph(data.avgGPA, "course-desc");
    containerGPA.appendChild(averageGPA);

    // Connect all containers to the overview content
    appendContainers(overviewContent, containerDesc, containerCreds, containerLevel, containerGPA);

    return overviewContent;
  }

  /**
   * Helper function to create a container for course overview sections.
   * @param {string} title - The title of the container section.
   * @returns {HTMLElement} - The created container element.
   */
  function createContainer(title) {
    let container = document.createElement("section");
    container.classList.add("containers");

    let containerTitle = createParagraph(title, "bold");
    container.appendChild(containerTitle);

    return container;
  }

  /**
   * Helper function to append multiple containers to a parent container.
   * @param {HTMLElement} parent - The parent container to which other containers will be appended.
   * @param {...HTMLElement} containers - The containers to be appended.
   */
  function appendContainers(parent, ...containers) {
    containers.forEach(container => {
      parent.appendChild(container);
    });
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

    let courseDays = document.createElement("p");
    courseDays.textContent = "Course day: " + course.date.split(/\s{2}/)[0];

    let courseSubject = document.createElement("p");
    courseSubject.textContent = "Course Subject: " + course.subject;

    courseContainer.appendChild(courseName);
    courseContainer.appendChild(courseTitle);
    courseContainer.appendChild(courseLevel);
    courseContainer.appendChild(courseCredits);
    courseContainer.appendChild(courseDays);
    courseContainer.appendChild(courseSubject);

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
    try {
      let username = localStorage.key(0);
      let password = JSON.parse(localStorage.getItem(username))[0];
      let params = new FormData();

      params.append("username", username);
      params.append("password", password);

      let response = await fetch("/signout", {method: "POST", body: params});

      await statusCheck(response);
      if (response.status === SUCCESS_CODE) {
        localStorage.removeItem(username);
        id("error-message-enroll").textContent = "";
        id("login").classList.remove("hidden");
        id("display-login").classList.remove("hidden");
        id("signout").classList.add("hidden");
        id("display-user").classList.add("hidden");
      }
    } catch (error) {
      handleErr(error);
    }
  }

  /**
   * The official login function that sends a fetch request to the server to log in the user.
   * It also saves the user's password if the user wants to save it.
   */
  async function loginOfficial() {
    let username = id("username").value.trim();
    let password = id("password").value.trim();
    let savePass = id("save-name");
    if (username !== '' && password !== '') {
      try {
        let params = new FormData();
        params.append("username", username);
        params.append("password", password);
        let saveUser = false;
        if (savePass.checked) {
          params.append("savePassWord", true);
          saveUser = true;
        }
        let result = await fetch("/login", {method: "POST", body: params});
        await helperLoginOfficial(result, username, password, saveUser);
      } catch (err) {
        handleErr(err);
      }
    } else {
      let msg = id("error-message");
      msg.classList.add("error");
      msg.textContent = "Please fill in all the fields";
    }
  }

  /**
   * Method used to break down the login function into two helper functions.
   * if the resultant fetch was good, call loginOfficialHelper.
   * @param {Object} result - result from the fetch request
   * @param {String} username - username of the user
   * @param {String} password - password of the user
   * @param {Boolean} saveUser - Boolean representing whether or not we shoudl save user.
   */
  async function helperLoginOfficial(result, username, password, saveUser) {
    if (result.status === USER_ERROR_CODE) {
      // bad request from user.
      id("error-message").textContent = "Invalid username or password";
      id("error-message").classList.add("error");
    } else {
      await statusCheck(result);
      loginOfficialHelper(result, username, password, saveUser);
    }
  }

  /**
   * Helper function that helps with the login function.
   * @param {Object} result - result from the fetch request
   * @param {String} username - username of the user
   * @param {String} password - password of the user
   * @param {Boolean} saveUser - Boolean representing whether or not we shoudl save user.
   */
  async function loginOfficialHelper(result, username, password, saveUser) {
    if (result.status === SUCCESS_CODE) {
      toggleActiveLogin();
      id("login").classList.add("hidden");
      id("display-login").classList.add("hidden");
      id("signout").classList.remove("hidden");
      id("display-user").textContent = "Welcome, " + username;
      id("display-user").classList.remove("hidden");
      id("error-message-enroll").textContent = "";
      let localStorageData = [password, saveUser];
      window.localStorage.setItem(username, JSON.stringify(localStorageData));
    } else {
      id("error-message").textContent = await result.text().message;
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
   * Function that handles the error when the user tries to log in.
   * @param {Object} err - error object that is thrown
   */
  function handleErr(err) {
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