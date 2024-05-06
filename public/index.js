"use strict";
(function() {
  window.addEventListener("load", init);

  /** Function that runs when the page is loaded and sets up other functions. */
  function init() {
    id("login").addEventListener("click", login);
  }

  /**
   * Function that runs when the submit button is clicked.
   * It logs a message to the console.
   * @returns {void} - The function does not return anything.
   */
  function login() {
    id("login").style.display = "none";
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} id - element ID
   * @return {object} DOM object associated with id.
   */
  function id(id) {
    return document.getElementById(id);
  }
})();