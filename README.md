# Final Project

### Guide to Partnered Git
When multiple people work on the same GitLab project, things become a bit more complicated than the normal `clone`, `add`, `commit`, `push`. The following is a mini guide on how to work with a partner on the same repository. However, this guide is useless without one extremely important thing: **you must communicate with your partner.** If you are going to work on sections of the assignment separately, let your partner know when you are working on which part. This way, you don’t both accidentally work on the same section.
1. Each person does `git clone` as they would for any normal assignment
2. Every time before you start working on your local repo, run `git pull`
3. After you finish implementing what you were working on, do `git add`, `git commit`, and `git push` (Do this **every time**. Do not just save and come back to it later.)

#### Merge Conflicts

If everything goes right with you and your partner pushing to/pulling from git, you won't need to use this part of the guide. However, it is a possibility that something will go wrong so we are going to provide a mini-guide on resolving merge conflicts. You can access it [here](merge-conflict-guide.md).

#### Pull Request work flow

Here is an overview of the pull request workflow:
1. “Pull” the changes to your local machine (get the most recent base)
2. Create a “branch” (version)
3. Commit the changes
4.a Push your changes
4.b Open a “pull request” (propose changes)
5. Discuss and review your code
6. Rebase and tests
7. “Merge” your branch to the master branch

#### Feature 1: display the items on a “main view” page
Front End
  * A way for the user to be able to browse through all items
  * A way for the user to toggle between at least 2 layouts (e.g. list vs. grid, cozy vs. compact, etc.). The toggling should be accomplished via CSS classes.

Back End
  * Endpoint to retrieve all items

#### Feature 2: allow the user to login to their account
Front End
  * A way for the user to provide a valid username and password to gain access to account-required actions
  * A way for the user to allow the browser to save their username across browser sessions (i.e. the next time they try to login)

Back End
  * Endpoint to check if the username and password match an entry in the database
  * **Note**: You do not need to implement the "Create a New User" feature for this feature to work. You can manually add preset username/password combinations to your database and then use those credentials when logging in.

#### Feature 3: clicking on any individual item should bring the user to a view which provides more detailed information about said item
Front End
  * This can be implemented by using JS/DOM manipulation
  * This view must include at least 4 pieces of information about the item (i.e. name, image, description, price, dates, availability, tags, color, address, phone number, seller, professor, department, etc.)

Back End
  * Endpoint to retrieve detailed item information

#### Feature 4: users must be able to buy a product, enroll in a class, or reserve a service
Front End
  * Users must be logged in to make the purchase/enroll/reserve
  * The user can buy one product, enroll in one class, or reserve one service at a time
  * A way for the user to confirm and submit the transaction (these are two separate actions)
    * The user should not be able to change their transaction after confirming it. If any changes are made to the transaction, the user must re-confirm their transaction before submitting it
  * Based on user input, there must be a possibility for the transaction to succeed or fail (it is up to you to determine what constitutes a success or failure)
  * After a successful transaction, the user must be given a confirmation number (hint: this could be useful in feature 6)
    * A confirmation number is a **unique** alphanumeric sequence of characters that identifies a transaction. It is up to you to decide how to generate confirmation numbers
  * **Note**: If you choose to implement a cart feature, you should first allow items to be added to the cart and then users can buy everything in the cart at once or enroll in all classes at once

Back End
  * Endpoint to check if transaction is successful or not
  * You should make sure the user is **logged in**
  * If the transaction is successful, update the database, and return a generated confirmation code
  * Users should not be able to buy products that are out of stock, enroll in full classes, or make reservations for services that are unavailable

#### Feature 5: users must be able to search and filter the available items
Front End
  * Must implement a search bar
    * Must be able to search multiple types of information
    * Must be able to type in the search bar
  * Must implement a way to filter items (e.g. displaying only pants, only classes that start with CSE, only reservations in the Bahamas, etc.)
    * Must be able to toggle filters on and off
      * This differs from the search bar because the filters should be preset and not user-generated. The users can select the filter they need from all possible filters.
    * This can be done by implementing categories/tags (i.e. furniture, clothing, food, department, prerequisite, travel location)
  * **Note**: You do not need to implement the ability to filter search results or search through filtered results. However, you are welcome to add these features if you would like

Back End
  * Endpoint to search database and return results
  * Must search at least 3 different columns in the database
    * The 3 column requirement is satisfied by searches performed through filtering and the search bar

#### Feature 6: users must be able to access all previous transactions
Front End
  * Users must be logged in
  * Users must be able to view information about their transaction including but not limited to the name of the item and the confirmation number for each transaction

Back End
  * Endpoint to retrieve transaction history for any given user
  * You should make sure the user is **logged in**

Based on your implementation choices, it might be better to combine some of the endpoints listed above or split them into multiple smaller endpoints. This is allowed as long as you make sure to include all of the same back end functionality. However, you must have at least 4 endpoints defined in your `app.js`.

### Additional Features (Choose Two)

#### Course Enrollment Site

##### Additional Feature 1: Permissions to Enroll
  * A logged in user must meet all the requirements in order to enroll for a class.
    * These requirements must be visible to the user.
  * Requirements must be at least: having taken the pre-requisites, being in the major, and the class having available seats.
  * This may require saving additional metadata for classes/users.

##### Additional Feature 2: Notify Users of Class Availability
  * Users may be able to add themselves to a waitlist for classes that have no available spots left.
  * If spots open up, the user should be notified in some way.
    * For example, users may be notified the next time they log in if a spot opens up while they are offline.
  * **Note**: This may be difficult to test because you and your partner are the only "users". For the presentation, you may make changes to the database manually to show this feature.

##### Additional Feature 3: Bulk Enroll
  * Users may add classes to a "cart."
  * The classes in the "cart" should persist through refreshing of the page, for at least a couple of days.
  * Users should be able to navigate somewhere to see the classes in the "cart." There should then be the option to bulk enroll in these classes.
  * All of the items in the bulk enroll should be given the same confirmation code as each item is enrolled together in one transaction.

##### Additional Feature 4: Schedule builder
  * Users may have the website build a schedule for them based on the classes in the “cart.”
  * This requires dates and time metadata for classes in the inventory.
  * Your schedule builder algorithm should in some way display all of the possible schedules based on the user's “cart.”
  * **Note**: This should be difficult to implement. It deals with time conflicts, and exhausting all the possible combinations of the classes that work together. While it may be difficult, it will also be fun and a valuable "challenge" to discuss during something like a job interview!

##### Additional Feature 5: Degree Audit
  * Users may have the website audit a degree. This can be either a major or a minor.
  * Your website should now store information about class requirements to complete a degree in a specific major/minor.
  * If the user chooses to audit a degree, the website should display valuable information about completed classes that count towards the degree, as well as any classes that still need to be taken to complete the degree.
  * There must be at least 5 classes within at least 1 department for minors, and at least 10 classes within at least 3 departments for majors.

# Internal Requirements

All patterns and practices defined as internal requirements in past assignments continue to apply here (e.g., following code quality guidelines, using the module pattern in front end JavaScript, proper use of `async`/`await` and promises, all errors handled appropriately, `statusCheck` used appropriately in fetch chains, minimizing the use of module-global variables, etc.).
