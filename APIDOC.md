# *FILL IN NAME* API Documentation
This API is the source of our website. The main functionality includes grabbing information about classes and users information to display on the website. Clients can also make certain request such as searching, enrolling in a course, or even saving past history.



## Get information about all the classes that exists in databases *
**Request Format:** */getItems*

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
**Request Format:** /signout

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

  - If the passed in username or passwrod doesn't exist, then the following
    error message is returned: ("Username or Password is empty, please try again")


## Login in a user (Come back later)
**Request Format:** /

**Request Type:** *Fill in request type*

**Returned Data Format**: Plain Text

**Description:** *Fill in description*

**Example Request:** *Fill in example request*

**Example Response:**
*Fill in example response in the {}*

```

```

**Error Handling:**
*Fill in an example of the error handling*