"use strict";
(function() {
  window.addEventListener("load", init);

  /** Function that runs when the page is loaded and sets up other functions. */
  function init() {
    document.getElementById("login").addEventListener("click", login);
  }

  /**
   * Function that runs when the submit button is clicked.
   * It logs a message to the console.
   * @returns {void} - The function does not return anything.
   */
  function login() {
    console.log('you pressed login button.');
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