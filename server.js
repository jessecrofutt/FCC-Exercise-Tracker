const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

const Schema = mongoose.Schema;
  
const userSchema = new Schema({
  username: {
    type: String, 
    required: true,
    min: 1    
  },
  exerciseCount: {
    type: Number,
    default: 0
  },
  exercises: []
});

const exerciseSchema = new Schema({
 
  description: {
    type: String,
    required: true,
    min: 1
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 36000
  },
  date: {
    default: Date.now,
    type: Date,
    required: true
  }

});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  let newUser = new User({
    username: req.body.username
  });
  console.log(newUser);
  newUser.save((err, user) => {
    if (err)
      console.log(err);
    res.send({
      username: user.username,
      id: user._id
    });
  });
});

app.post('/api/exercise/add', (req, res) => {
  
  let newDate;
  if (req.body.date) { //if and empty req.body.date date is given the default date wont trigger
    newDate =  req.body.date;
  };
  
  let newExercise = new Exercise({
    description: req.body.description,
    duration: req.body.duration,
    date: newDate
  });
  console.log(req.body.userId);
  let taco;
  User.findById({_id: req.body.userId}, (err, foundUser) => {
    foundUser.exercises = foundUser.exercises.concat([newExercise]);
    foundUser.exerciseCount ++;
    foundUser.save((err, fuser) => {
      if (err)
        console.log(err);
      console.log('no error, fuser: ', fuser);
      res.send({
        username: fuser.username,
        id: fuser._id,
        exercise: newExercise
      });
    });
  });
});

app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, docs) => {
    let compactDocs = docs.map(user => {
      return {
        username: user.username,
        id: user._id
      };
    });
    if (err)
      console.log(err);
    res.send(compactDocs);
  });
});

app.get('/api/exercise/log', (req, res) => {
  // console.log(req.query.userId);
  let dateFrom = new Date(req.query.from);
  let dateTo = new Date(req.query.to);
  console.log('req.query.from: ', dateFrom);
  console.log('req.query.to: ', dateTo);
  
  User.findById({_id: req.query.userId}, (err, user) => {
    let ex = user.exercises;
    if (req.query.from) 
      ex = ex.filter(e => {
        console.log('e.date: ', e.date);
        console.log('req.query.from: ', req.query.from);
        return e.date >= dateFrom;
      });
    if (req.query.to) 
      ex = ex.filter(e => e.date <= dateTo);
    if (req.query.lim)
      ex = ex.slice(0,req.query.lim);
    ex.sort((a,b) => a.date > b.date);
    if (err)
        console.log(err);
    res.send({
        username: user.username,
        id: user._id,
        count: ex.length,
        exercises: ex
      });
  });    
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
