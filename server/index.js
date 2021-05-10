const express = require('express');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
const monk = require('monk');
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');

const app = express();

// if MONGO_URI variable is defined, connect to it that database. 
//Otherwise, connect to localhost database
const db = monk(process.env.MONGO_URI || 'localhost/woofer');
const woofs = db.get('woofs');
const users = db.get('users');
const filter = new Filter();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Woofer. Woof woof!'
  })
})


// get all woofs from database
app.get('/woofs', (res, req) => {
  woofs
    .find()
    .then(woofs => {
      res.json(woofs);
    });
});


// Add a user to users database
app.post('/users', 
  // Using express validator to check user's input fields
  [
    check('Username', 'Username must be minimum 5 characters').isLength({min: 5}),
    check('Username', 'Username cannot contain non-alphanumeric characters').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Password', 'Password cannot contain non-alphanumeric characters').isAlphanumeric(),
    check('Email', 'Not a valid email address - incorrect format').isEmail(),
    check('Birthday', 'Not a valid date -- enter as YYYY-MM-DD').isDate()
  ], (req, res) => {

    // check the validator objects for errors
    let errors = validationResult(req);

    if(!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + ' already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: req.body.Password,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) =>{res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});


// Test with Postman - get all users
app.get('/users', (req, res) => {
  users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// Test with Postman - get a user by username
app.get('/users/:Username', (req, res) => {
  users.findOne( { Username: req.params.Username } )
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// Update a user's info by Username (Expecting a JSON file with Username: string(REQUIRED), 
// Password: string(REQUIRED), Email: string(REQUIRED, and Birthday: Date))
app.put('/users/:Username',
[
  check('Username', 'Username must be minimum 5 characters').isLength({min: 5}),
  check('Username', 'Username cannot contain non-alphanumeric characters').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Password', 'Password cannot contain non-alphanumeric characters').isAlphanumeric(),
  check('Email', 'Not a valid email address - incorrect format').isEmail(),
  check('Birthday', 'Not a valid date -- enter as YYYY-MM-DD').isDate()
], (req, res) => { 
 
  let errors = validationResult(req);

  if(!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Username,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});


// make sure the user did not enter an empty string for both the Name field and Content field
function isValidWoof(woof) {
  return woof.name && woof.name.toString().trim() !== '' &&
    woof.content && woof.content.toString().trim() !== '';
}


// limiting post requests to once every 30 seconds
app.use(rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1 // limit to 1 request every 30 seconds
}));

app.post('/woofs', (req, res) => {
  if(isValidWoof(req.body)) {
    // insert object into database if both Name & Content entered are valid
    const woof = {
      name: filter.clean(req.body.name.toString()),
      content: filter.clean(req.body.content.ToString()),
      created: new Date()
    }

    woofs
      .insert(woof)
      .then(createdWoof => {
        res.json(createdWoof);
      });
  } else {
    res.status(422);
    res.json({
      message: 'Name and Content are required!'
    })
  }
})


// Listening on local port(localhost:5000)
app.listen(5000, () => {
  console.log('Listening on http://localhost:5000');
});