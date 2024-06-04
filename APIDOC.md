# HENNYJIM MYPLAN API Documentation
This API is the source of our website. The main functionality includes grabbing information about classes and users information to display on the website. Clients can also make certain request such as searching, enrolling in a course, or even saving past history.



## Get information about all the classes that exists in databases *
**Request Format:** /getItems

**Request Type:** Get

**Returned Data Format**: JSON

**Description:** Retrives all the classes alongside their information from the database

**Example Request:** /getItems
**Example Response:**

```json
{
  "classes": [
    {
      "id": 1,
      "name": "Introduction to Computer Science I",
      "description": "Introduction to computer programming for students without previous programming experience. Students write programs to express algorithmic thinking and solve computational problems motivated by modern societal and scientific needs. Includes procedural programming constructs (methods), control structures (loops, conditionals), and standard data types, including arrays.",
      "avgGPA": 3.05,
      "subject": "Computer Science",
      "availableSeats": 360,
      "date": "M W F  9:30-10:30",
      "courseLevel": 100,
      "credits": 5,
      "shortName": "CSE 121",
      "totalSeats": 362
    },
    {
      "id": 4,
      "name": "Intermediate Expository Writing",
      "description": "Writing papers communicating information and opinion to develop accurate, competent, and effective expression.",
      "avgGPA": 3.77,
      "subject": "English",
      "availableSeats": 1,
      "date": "T Th  9:30-10:30",
      "courseLevel": 200,
      "credits": 5,
      "shortName": "ENGL 281",
      "totalSeats": 45
    },
    {
      "id": 5,
      "name": "Calculus With Analytic Geometry III",
      "description": "Third quarter in calculus sequence. Introduction to Taylor polynomials and Taylor series, vector geometry in three dimensions, introduction to multivariable differential calculus, double integrals in Cartesian and polar coordinates.",
      "avgGPA": 3.36,
      "subject": "Math",
      "availableSeats": 97,
      "date": "M W F  8:30-9:20",
      "courseLevel": 100,
      "credits": 5,
      "shortName": "MATH 126",
      "totalSeats": 120
    }
  ]
}
```

**Error Handling:**
- Possible 500 errors (All errors will send back plain text):
  - A server side error that occurs will return the following message:
    - "An error occurred on the server. Try again later."


## Signs out a logged in user
**Request Format:** /signout with two POST parameters of username and password

**Request Type:** Post

**Returned Data Format**: Plain text

**Description:** Signs out the user and updates the login status of that user to false.

**Example Request:** POST parameters of `username=henok206` and `password=theFlash`

**Example Response:**
```
Signout successful
```

**Error Handling:**
- Possible 400 (invalid request) errors
  - If the passed in username or password doesn't match a specified account
    then the folowing error message is returned: ("Signout failed");

  - If the passed in username or password doesn't exist, then the following
    error message is returned: ("Username or Password is empty, please try again")


## Login in a user
**Request Format:** "/login" with POST parameters of username and password

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Checks whether or not a user can login given their credientials

**Example Request:** POST parameters of `username=henok206` and `password=theFlash`

**Example Response:**
```
Login successful
```

**Error Handling:**
- Possible 400 (User specfic) errors
  - If the passed in username or password doesn't match a specified account
    then the folowing error message is returned: ("Login failed. Invalid user.");

  - If the passed in username or password doesn't exist, then the following
    error message is returned: (Username or Password is empty, please try again")


## Provides more information about a specfic course
**Request Format:** /itemDetails/:className

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns a JSON array of information about the class that
                  average GPA, subject, description, etc. The selection for a class information is specified by the user.

**Example Request:** /itemDetails/CSE 121

**Example Response:**

```json
{
  "classes": [
    {
      "id": 1,
      "name": "Introduction to Computer Science I",
      "description": "Introduction to computer programming for students without previous programming experience. Students write programs to express algorithmic thinking and solve computational problems motivated by modern societal and scientific needs. Includes procedural programming constructs (methods), control structures (loops, conditionals), and standard data types, including arrays.",
      "avgGPA": 3.05,
      "subject": "Computer Science",
      "availableSeats": 355,
      "date": "M W F  9:30-10:30",
      "courseLevel": 100,
      "credits": 5,
      "shortName": "CSE 121",
      "totalSeats": 362
    },
    {
      "id": 3,
      "name": "Introduction to Computer Science I",
      "description": "Introduction to computer programming for students without previous programming experience. Students write programs to express algorithmic thinking and solve computational problems motivated by modern societal and scientific needs. Includes procedural programming constructs (methods), control structures (loops, conditionals), and standard data types, including arrays.",
      "avgGPA": 3.05,
      "subject": "Computer Science",
      "availableSeats": 350,
      "date": "M W F  13:30-15:30",
      "courseLevel": 100,
      "credits": 5,
      "shortName": "CSE 121",
      "totalSeats": 362
    }
  ]
}
```
**Error Handling:**
Possible 400 (Invalid Requests) errors:
 - If the course specified doesn't exist, an error message returned of the following is
  returned: ("No item specified");

Possible 500 errors:
- If something goes wrong on the server while searching for course information,
  the following message is returned: ("An error occurred on the server. Try again later.")

## Enrolls a course to logged in users courses
**Request Format:** "/enrollCourse" with POST parameters of username and password


**Request Type:** POST with POST parameters of username, className, and classId

**Returned Data Format**: Plain Text

**Description:** Updates the user course schedule to include the added course. In addition
                a confirmation code is created to represent the enrollment.


**Example Request:** POST parameters of `userName=henok206`, `className=MATH 126`
                      and, `id=5`

**Example Response:**

```
Successfully added course, this is the confirmation code: wS{D.t
```

**Error Handling:**
Possible 400 (Invalid Requests) errors:
 -  If the user isn't logged in, an error message of the following is
  returned: ("You are not logged in. Please sign in");

  - If the class that the user requested to login to doesn't exist, another
    error message is returned: ("This class does not exist");

  - If there isn't enough space within the class of the user's choice, this error
    message is returned: ("This course is add capacity. Cannot enroll");

  - If a time conflict exists between the class of the user's choice and a
    already enrolled class of the user, another message is a returned:
    ("Cannot enroll in a class you have already enrolled.");

  - In the unfortunate case that the username isn't specified by the user
    an error message is returned.

## Search and filter the class provided by myUW website
**Request Format:** /search

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Performs a search on the set of classes the our backend provides and matches that against the search term and filters.

**Example Request:** /search?date=["M", "F"]&subject=["Computer Science"]

**Example Response:**

```JSON
{
  "classes": [
    {
      "id": 1,
      "name": "Introduction to Computer Science I",
      "description": "Introduction to computer programming for students without previous programming experience. Students write programs to express algorithmic thinking and solve computational problems motivated by modern societal and scientific needs. Includes procedural programming constructs (methods), control structures (loops, conditionals), and standard data types, including arrays.",
      "avgGPA": 3.05,
      "subject": "Computer Science",
      "availableSeats": 319,
      "date": "M W F  9:30-10:30",
      "courseLevel": 100,
      "credits": 5,
      "shortName": "CSE 121",
      "totalSeats": 362
    },
    {
      "id": 6,
      "name": "The Hardware/Software Interface",
      "description": "Examines key computational abstraction levels below modern high-level languages; number representation, assembly language, introduction to C, memory management, the operating-system process model, high-level machine architecture including the memory hierarchy, and how high-level languages are implemented.",
      "avgGPA": 3.59,
      "subject": "Computer Science",
      "availableSeats": 61,
      "date": "M W F  11:30-12:20",
      "courseLevel": 300,
      "credits": 4,
      "shortName": "CSE 351",
      "totalSeats": 196
    }
  ]
}

```

**Error Handling:**
Possible 400 (Invalid Requests) errors:
 - If the search (filters and contents in the search bar) doesn't match a class in the database, this message is shared: "This search combination yielded not results".

Possible 500 errors:
 - If something goes wrong on the server while searching for courses,
  the following message is returned: ("An error occurred on the server. Try again later.")


## Get all courses that a logged in User is taking
**Request Format:** /previousTransactions

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Retrieves the entire course history of saved user schedules. The format is a triply nested JSON object.


**Example Request:** /previousTransactions?username=henok206

**Example Response:**

```json
{
  "^Bv8Jy": [
    {
      "CSE 121": {
        "date": "M W F  9:30-10:30",
        "availableSeats": 319,
        "subject": "Computer Science",
        "description": "Introduction to computer programming for students without previous programming experience. Students write programs to express algorithmic thinking and solve computational problems motivated by modern societal and scientific needs. Includes procedural programming constructs (methods), control structures (loops, conditionals), and standard data types, including arrays.",
        "credits": 5
      }
    },
    {
      "MATH 126": {
        "date": "M W F  8:30-9:20",
        "availableSeats": 72,
        "subject": "Math",
        "description": "Third quarter in calculus sequence. Introduction to Taylor polynomials and Taylor series, vector geometry in three dimensions, introduction to multivariable differential calculus, double integrals in Cartesian and polar coordinates.",
        "credits": 5
      }
    }
  ]
}
```

**Error Handling:**
Possible 400 (client created) errors:
  - If the user isn't logged in, an error message of the following is
  returned: ("You are not logged in. Please sign in");

  - If there has been no population of the users course history yet,
    this error message is thrown ("No course history for this user");